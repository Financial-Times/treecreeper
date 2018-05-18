const { stripIndents } = require('common-tags');
const logger = require('@financial-times/n-logger').default;
const { session: db } = require('../db-connection');
const EventLogWriter = require('../lib/event-log-writer');
const Kinesis = require('../lib/kinesis');

const kinesisClient = new Kinesis(
	process.env.CRUD_EVENT_LOG_STREAM_NAME || 'test-stream-name'
);
const eventLogWriter = new EventLogWriter(kinesisClient);

const ERROR_RX = Object.freeze({
	nodeExists: /already exists with label/,
	missingRelated: /Expected to find a node at related(\d+) but found nothing/
});

const sendEvent = event =>
	eventLogWriter.sendEvent(event).catch(error => {
		logger.error(
			'Failed to send event to event log',
			Object.assign({ event, error: error })
		);
	});

// compare returns 0 if same integer, so this is a boolean check for equality
const isSameInteger = (int1, int2) => !int1.compare(int2);

const sanitizeNodeType = nodeType =>
	nodeType.charAt(0).toUpperCase() + nodeType.substr(1).toLowerCase();

const sanitizeCode = code => code.toLowerCase();

const sendRelationshipEvents = (requestId, result) => {
	const node = result.records[0].get('node');
	result.records.forEach(record => {
		const target = record.get('related');
		const rel = record.get('relationship');

		if (target.properties.createdByRequest === requestId) {
			sendEvent({
				event: 'CREATED_NODE',
				action: EventLogWriter.actions.CREATE,
				code: target.properties.id,
				type: target.labels[0]
			});
		}

		if (rel.properties.createdByRequest === requestId) {
			sendEvent({
				event: 'CREATED_RELATIONSHIP',
				action: EventLogWriter.actions.UPDATE,
				relationship: {
					relType: rel.type,
					direction: isSameInteger(rel.start, node.identity)
						? 'outgoing'
						: 'incoming',
					nodeCode: target.properties.id,
					nodeType: target.labels[0]
				},
				code: node.properties.id,
				type: node.labels[0]
			});

			sendEvent({
				event: 'CREATED_RELATIONSHIP',
				action: EventLogWriter.actions.UPDATE,
				relationship: {
					relType: rel.type,
					direction: isSameInteger(rel.start, node.identity)
						? 'incoming'
						: 'outgoing',
					nodeCode: node.properties.id,
					nodeType: node.labels[0]
				},
				code: target.properties.id,
				type: target.labels[0]
			});
		}
	});
};

const buildNode = (result, includeRelationships) => {
	const node = result.records[0].get('node');
	const response = {
		node: Object.assign({}, node.properties)
	};
	if (response.node.createdByRequest) {
		delete response.node.createdByRequest;
	}

	// if related is not defined it means we've done an optional match on relationships
	// and retrieved none
	if (includeRelationships) {
		// check relationship key exists and is not null
		if (result.records[0].has('related') && result.records[0].get('related')) {
			response.relationships = result.records.map(record => {
				const target = record.get('related');
				const rel = record.get('relationship');
				return {
					relType: rel.type,
					direction: isSameInteger(rel.start, node.identity)
						? 'outgoing'
						: 'incoming',
					nodeType: target.labels[0],
					nodeCode: target.properties.id
				};
			});
		} else {
			response.relationships = [];
		}
	}

	return response;
};

const relFragment = (type, direction) => {
	const left = direction === 'incoming' ? '<' : '';
	const right = direction === 'outgoing' ? '>' : '';
	return `${left}-[rel:${type}]-${right}`;
};

const get = async ({ requestId, nodeType, code, includeRelationships }) => {
	logger.info({ requestId, nodeType, code, method: 'GET' });
	nodeType = sanitizeNodeType(nodeType);
	code = sanitizeCode(code);

	const related = includeRelationships
		? 'WITH node OPTIONAL MATCH (node)-[relationship]-(related)'
		: '';
	const returned = includeRelationships
		? 'node, relationship, related'
		: 'node';

	const query = stripIndents`MATCH (node:${nodeType} { id: $code }) ${related} RETURN ${returned}`;

	logger.info({ requestId, query });

	const result = await db.run(query, { code });

	if (!result.records.length) {
		throw { status: 404, message: `${nodeType} ${code} not found` };
	}

	return buildNode(result, includeRelationships);
};

const upsertRelationshipQuery = ({
	relType,
	direction,
	nodeType,
	nodeCode,
	requestId
}) =>
	stripIndents`
	WITH node
	MERGE (related:${sanitizeNodeType(nodeType)} {id: "${sanitizeCode(nodeCode)}"})
		ON CREATE SET related.createdByRequest = "${requestId}"
	WITH related, node
	MERGE (node)${relFragment(relType, direction, requestId)}(related)
		ON CREATE SET rel.createdByRequest = "${requestId}"`;

const createRelationshipQuery = ({
	relType,
	direction,
	nodeType,
	nodeCode,
	requestId,
	i
}) =>
	// uses OPTIONAL MATCH as this returns [null] rather than []
	// this means the next line tries to create a relationship pointing
	// at null, so we get an informative error
	stripIndents`WITH node
	OPTIONAL MATCH (related${i}:${sanitizeNodeType(nodeType)} {id: "${sanitizeCode(
		nodeCode
	)}"})
	MERGE (node)${relFragment(relType, direction, requestId)}(related${i})
		ON CREATE SET rel.createdByRequest = "${requestId}"`;

const create = async ({
	requestId,
	nodeType,
	code,
	upsert,
	body: { node: attributes = {}, relationships = [] }
}) => {
	logger.info({
		requestId,
		nodeType,
		code,
		attributes,
		relationships,
		upsert,
		method: 'POST'
	});

	nodeType = sanitizeNodeType(nodeType);
	code = sanitizeCode(code);

	if (attributes.id && sanitizeCode(attributes.id) !== code) {
		throw {
			status: 400,
			message: `Conflicting id attribute \`${
				attributes.id
			}\` for ${nodeType} ${code}`
		};
	}

	attributes.createdByRequest = requestId;

	attributes.id = code;

	try {
		const queryParts = [`CREATE (node:${nodeType} $attributes)`];

		if (relationships.length) {
			if (upsert) {
				queryParts.push(
					...relationships.map(rel =>
						upsertRelationshipQuery(Object.assign({ requestId }, rel))
					)
				);
			} else {
				queryParts.push(
					...relationships.map((rel, i) =>
						createRelationshipQuery(Object.assign({ requestId, i }, rel))
					)
				);
			}
			queryParts.push(
				stripIndents`WITH node
				MATCH (node)-[relationship]-(related)
				RETURN node, relationship, related`
			);
		} else {
			queryParts.push(`RETURN node`);
		}

		const query = queryParts.join('\n');

		logger.info({ requestId, query });
		const result = await db.run(query, { attributes });
		sendEvent({
			event: 'CREATED_NODE',
			action: EventLogWriter.actions.CREATE,
			code,
			type: nodeType
		});

		if (!!relationships.length) {
			//log any created relationships and nodes
			sendRelationshipEvents(requestId, result);
		}

		return buildNode(result, true);
	} catch (err) {
		console.log('rhys', err);
		const message = err.message;

		if (ERROR_RX.nodeExists.test(message)) {
			throw { status: 400, message: `${nodeType} ${code} already exists` };
		}
		const missingRelatedIndex = (ERROR_RX.missingRelated.exec(message) ||
			[])[1];
		if (missingRelatedIndex) {
			const missingRelationship = relationships[missingRelatedIndex];
			throw {
				status: 400,
				message: stripIndents`Missing related node ${
					missingRelationship.nodeType
				} ${
					missingRelationship.nodeCode
				}. If you need to create multiple things which depend on each other,
				use the \`upsert=true\` query string to create placeholder entries for
				related things which can be populated with attributes with subsequent
				API calls.
				DO NOT use \`upsert\` if you are attempting to create a relationship with
				an item that already exists - there's probably a mistake somewhere in your
				code`
			};
		}
		throw err;
	}
};

module.exports = { get, create }; //, _createRelationships, update, remove, getAll, getAllforOne };

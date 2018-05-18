/* eslint-disable */
const { oneLine } = require('common-tags');
const logger = require('@financial-times/n-logger').default;
const { session: db } = require('../db-connection');
const EventLogWriter = require('../lib/event-log-writer');
const Kinesis = require('../lib/kinesis');

const kinesisClient = new Kinesis(
	process.env.CRUD_EVENT_LOG_STREAM_NAME || 'test-stream-name'
);
const eventLogWriter = new EventLogWriter(kinesisClient);

const sendEvent = event =>
	eventLogWriter.sendEvent(event).catch(error => {
		logger.error('Failed to send event to event log', { event });
	});

const lookupField = (record, fieldName) => {
	if (typeof record._fieldLookup[fieldName] === 'undefined') {
		return undefined;
	}
	return record._fields[record._fieldLookup[fieldName]];
};

const sendRelationshipCreationEvents = ({
	from,
	fromUniqueAttrName,
	fromUniqueAttrValue,
	to,
	toUniqueAttrName,
	toUniqueAttrValue,
	name
}) =>
	Promise.all(
		[
			{
				code: fromUniqueAttrValue,
				type: from,
				direction: 'to',
				relatedCode: toUniqueAttrValue,
				relatedType: to
			},
			{
				code: toUniqueAttrValue,
				type: to,
				direction: 'from',
				relatedCode: fromUniqueAttrValue,
				relatedType: from
			}
		].map(({ code, type, relatedCode, relatedType, direction }) =>
			sendEvent({
				event: 'CREATED_RELATIONSHIP',
				action: EventLogWriter.actions.UPDATE,
				relationship: {
					type: name,
					direction,
					relatedCode,
					relatedType
				},
				code,
				type
			})
		)
	);

const _createRelationshipAndNode = async ({
	from,
	fromUniqueAttrName,
	fromUniqueAttrValue,
	to,
	toUniqueAttrName,
	toUniqueAttrValue,
	name
}) => {
	const query = oneLine`
		MERGE (a:${from} {${fromUniqueAttrName}: '${fromUniqueAttrValue}'})
		ON CREATE SET a.created = true
		ON MATCH SET a.created = false
		MERGE (b:${to} {${toUniqueAttrName}: '${toUniqueAttrValue}'})
		ON CREATE SET b.created = true
		ON MATCH SET b.created = false
		MERGE (a)-[r:${name}]->(b)
		WITH a, b, r, a.created as createdFrom, b.created as createdTo
		REMOVE a.created, b.created
		RETURN r, createdFrom, createdTo
	`;
	console.log('[CRUD] relationship upsert query', query);

	const result = await db.run(query);

	const createdFrom = lookupField(result.records[0], 'createdFrom');
	const createdTo = lookupField(result.records[0], 'createdTo');

	if (createdFrom) {
		sendEvent({
			event: 'CREATED_NODE',
			action: EventLogWriter.actions.CREATE,
			code: fromUniqueAttrName,
			type: from
		});
	}
	if (createdTo) {
		sendEvent({
			event: 'CREATED_NODE',
			action: EventLogWriter.actions.CREATE,
			code: toUniqueAttrName,
			type: to
		});
	}

	return result.records && result.records.length > 0
		? lookupField(result.records[0], 'r')
		: undefined;
};

const _createRelationship = async ({
	from,
	fromUniqueAttrName,
	fromUniqueAttrValue,
	to,
	toUniqueAttrName,
	toUniqueAttrValue,
	name
}) => {
	const query = oneLine`
		MATCH (a:${from}), (b:${to})
		WHERE a.${fromUniqueAttrName} = '${fromUniqueAttrValue}'
		AND b.${toUniqueAttrName} = '${toUniqueAttrValue}'
		CREATE (a)-[r:${name}]->(b)
		RETURN r
	`;
	console.log('[CRUD] create relationship query', query);

	const result = await db.run(query);

	console.dir(result, { depth: null });

	return result.records && result.records.length > 0
		? lookupField(result.records[0], 'r')
		: undefined;
};

const _createRelationships = async (relationships, upsert) => {
	let result;
	for (const relationship of relationships) {
		try {
			const createFunction =
				upsert === 'upsert' ? _createRelationshipAndNode : _createRelationship;

			const singleResult = await createFunction(relationship);

			if (singleResult) {
				result = [singleResult];
				sendRelationshipCreationEvents(relationship);
			}
		} catch (e) {
			console.log('[CRUD] Relationship not created', e.toString());
		}
	}

	return result;
};

const get = async (
	res,
	nodeType,
	uniqueAttrName,
	uniqueAttr,
	relationships
) => {
	console.log(
		'[CRUD] get',
		nodeType,
		uniqueAttrName,
		uniqueAttr,
		relationships
	);

	try {
		const filter =
			uniqueAttrName && uniqueAttr
				? `{${uniqueAttrName}: "${uniqueAttr}"}`
				: '';
		const related = relationships ? '-[r]-(c)' : '';
		const returned = relationships ? 'a,r,c' : 'a';

		const query = `MATCH (a:${nodeType} ${filter}) ${related} RETURN ${returned}`;

		console.log('[CRUD]', query);

		const result = await db.run(query);

		if (!result.records.length) {
			return res
				.status(404)
				.send(`${nodeType} ${uniqueAttr ? uniqueAttr : ''} not found`);
		}

		const formattedResult = [];
		let previousID = null;
		let oneResult;
		result.records.forEach(record => {
			const currentID = lookupField(record, 'a').identity.low;
			if (previousID !== currentID) {
				if (previousID) {
					formattedResult.push(oneResult);
				}
				oneResult = lookupField(record, 'a').properties;
				if (relationships) {
					oneResult.relationships = [];
				}
				previousID = currentID;
			}
			if (relationships) {
				const to = lookupField(record, 'c');
				oneResult.relationships.push({
					name: lookupField(record, 'r').type,
					from: nodeType,
					fromUniqueAttrName: uniqueAttrName,
					fromUniqueAttrValue: uniqueAttr,
					to: to.labels[0],
					toUniqueAttrName: 'id',
					toUniqueAttrValue: to.properties.id
				});
			}
		});
		if (previousID) {
			formattedResult.push(oneResult);
		}

		console.log('[CRUD] GET formatted result');
		console.log(JSON.stringify(formattedResult, null, 2));

		return res.send(formattedResult);
	} catch (e) {
		console.log(e.toString());
		return res.status(500).send(e.toString());
	}
};

const create = async (
	res,
	nodeType,
	uniqueAttrName,
	uniqueAttr,
	obj,
	relationships,
	upsert
) => {
	console.log(
		'[CRUD] create',
		nodeType,
		uniqueAttrName,
		uniqueAttr,
		obj,
		relationships,
		upsert
	);

	if (uniqueAttrName) {
		const existingNode = `MATCH (a:${nodeType} {${uniqueAttrName}: "${uniqueAttr}"}) RETURN a`;

		console.log('[CRUD] exists query', existingNode);

		const result = await db.run(existingNode);
		if (result.records.length > 0) {
			console.log(
				nodeType,
				uniqueAttr,
				uniqueAttrName,
				'ALREADY EXISTS',
				JSON.stringify(result.records, null, 2)
			);
			return res
				.status(400)
				.send(
					`node with ${uniqueAttrName}=${obj[uniqueAttrName]} already exists`
				);
		}
	}

	try {
		// Make sure if we've said there is a primary key, then it is in the obj
		if (uniqueAttrName) {
			obj[uniqueAttrName] = uniqueAttr;
		}

		let response;

		if (nodeType) {
			const createQuery = `CREATE (a:${nodeType} $node) RETURN a`;
			console.log('[CRUD] query', createQuery);
			const result = await db.run(createQuery, { node: obj });
			sendEvent({
				event: 'CREATED_NODE',
				action: EventLogWriter.actions.CREATE,
				code: uniqueAttr,
				type: nodeType
			});
			if (!relationships) {
				return res.send(lookupField(result.records[0], 'a').properties);
			}
		}

		if (relationships) {
			const resultRel = await _createRelationships(relationships, upsert);

			if (!resultRel) {
				return res.status(400).send('error creating relationships');
			}

			return res.send(resultRel);
		}
	} catch (e) {
		console.log(`${nodeType} not created`, e.toString());
		return res.status(400).send(e.toString());
	}
};

const update = async (
	res,
	nodeType,
	uniqueAttrName,
	uniqueAttr,
	obj,
	relationships,
	upsert
) => {
	console.log('[CRUD] updating', obj, nodeType, uniqueAttrName, uniqueAttr);
	try {
		const updateQuery = oneLine`
			MATCH (a:${nodeType} {${uniqueAttrName}: "${uniqueAttr}"})
			SET a += $props
			RETURN a
		`;

		console.log('[CRUD] query', updateQuery);

		const result = await db.run(updateQuery, { props: obj });

		console.log('[CRUD] records', result.records);

		if (result.records.length === 0) {
			if (!upsert) {
				const message = `${nodeType}${uniqueAttr} not found. No nodes updated.`;
				console.log(message);
				return res.status(404).send(message);
			}

			const createQuery = `CREATE (a:${nodeType} $node) RETURN a`;

			if (uniqueAttrName) {
				obj[uniqueAttrName] = uniqueAttr;
			}

			console.log('[CRUD] create query (upsert)', createQuery);
			await db.run(createQuery, { node: obj });

			sendEvent({
				event: 'CREATED_NODE',
				action: EventLogWriter.actions.CREATE,
				code: uniqueAttr,
				type: nodeType
			});
		} else {
			sendEvent({
				event: 'UPDATED_NODE',
				action: EventLogWriter.actions.UPDATE,
				code: uniqueAttr,
				type: nodeType
			});
		}

		if (relationships) {
			const resultRel = await _createRelationships(relationships, upsert);

			if (!resultRel) {
				return res.status(400).send('error creating relationships');
			}

			return res.send(resultRel);
		}

		return res.send(
			result.records && result.records.length
				? lookupField(result.records[0], 'a').properties
				: result
		);
	} catch (e) {
		console.log('[CRUD] update error', e);
		return res.status(500).send(e.toString());
	}
};

const remove = async (res, nodeType, uniqueAttrName, uniqueAttr, mode) => {
	try {
		const deleteQuery = oneLine`
			MATCH (a:${nodeType} {${uniqueAttrName}: "${uniqueAttr}"}) ${
			mode === 'detach'
				? `OPTIONAL MATCH (a)-[r]-(b)
					WITH a, b, r, TYPE(r) as relationshipType, startNode(r).${uniqueAttrName} as startNodeId
					DELETE a, r
					RETURN
						relationshipType,
						b.${uniqueAttrName} as nodeId,
						labels(b) as nodeLabels,
						startNodeId`
				: // Conditional operations in neo4j
				  // http://markhneedham.com/blog/2014/06/17/neo4j-load-csv-handling-conditionals/
				  `OPTIONAL MATCH (a)-[r]-()
					FOREACH(x IN (CASE WHEN r IS NULL THEN [1] else [] END) |
						DELETE a
					)
					RETURN r as relationships`
		}`;
		console.log('[CRUD] delete query', deleteQuery);

		const result = await db.run(deleteQuery);

		if (
			result &&
			result.summary &&
			result.summary.counters &&
			result.summary.counters.nodesDeleted() >= 1
		) {
			result.records
				.map(record => ({
					relationshipType: lookupField(record, 'relationshipType'),
					nodeId: lookupField(record, 'nodeId'),
					nodeLabels: lookupField(record, 'nodeLabels'),
					direction:
						uniqueAttr === lookupField(record, 'startNodeId') ? 'from' : 'to'
				}))
				.filter(record => record.relationshipType)
				.sort((recordA, recordB) => recordA.nodeId < recordB.nodeId)
				.map(({ direction, relationshipType, nodeId, nodeLabels }) =>
					sendEvent({
						event: 'DELETED_RELATIONSHIP',
						action: EventLogWriter.actions.UPDATE,
						relationship: {
							type: relationshipType,
							direction,
							relatedCode: uniqueAttr,
							relatedType: nodeType
						},
						code: nodeId,
						type: nodeLabels[0]
					})
				);
			sendEvent({
				event: 'DELETED_NODE',
				action: EventLogWriter.actions.DELETE,
				code: uniqueAttr,
				type: nodeType
			});

			return res.status(200).send(`${uniqueAttr} deleted`);
		} else if (
			result.records.length > 0 &&
			lookupField(result.records[0], 'relationships')
		) {
			return res
				.status(400)
				.send(
					`Node has existing relationships. Specify mode=detach to force deletion.`
				);
		} else {
			return res.status(404).send(`${uniqueAttr} not found. No nodes deleted.`);
		}
	} catch (e) {
		console.error('[CRUD] delete failed', e);
		return res.status(500).send(e.toString());
	}
};

const getAllforOne = async (res, relationship, param) => {
	try {
		// TODO
		// use uniqueattr value and name instead of id
		// used by webPMA contract controller
		const query = oneLine`MATCH p=(${relationship.from} {id: "${param}"})-[r:${
			relationship.name
		}]->(${relationship.to}) RETURN p`;
		console.log('[CRUD] all for one query', query);

		const result = await db.run(query);

		if (result.records.length) {
			const elements = result.records.map(node => {
				return lookupField(record, 'p').end.properties;
			});
			return res.send(elements);
		} else {
			return res
				.status(404)
				.send(`No ${relationship.to} found for ${relationship.from} ${param}`);
		}
	} catch (e) {
		return res.status(500).send(e.toString());
	}
};

const getAll = async (res, nodeType, filters = '') => {
	try {
		const query = `MATCH (a:${nodeType} ${filters}) RETURN a`;
		console.log('[CRUD] get all query', query);

		const result = await db.run(query);

		if (result.records.length) {
			const elements = result.records.map(node => {
				return lookupField(record, 'a').properties;
			});

			return res.send(elements);
		} else {
			return res.status(404).send(`No ${nodeType} found`);
		}
	} catch (e) {
		return res.status(500).send(e.toString());
	}
};

module.exports = {
	get,
	create,
	_createRelationships,
	update,
	remove,
	getAll,
	getAllforOne
};

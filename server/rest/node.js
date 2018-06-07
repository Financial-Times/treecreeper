const { stripIndents } = require('common-tags');
const logger = require('@financial-times/n-logger').default;
const { session: db } = require('../db-connection');
const {
	dbErrorHandlers,
	queryResultHandlers,
	preflightChecks
} = require('./errors');
const { logNodeChanges: logChanges } = require('./kinesis');
const { sanitizeNode: sanitizeInput } = require('./sanitize-input');
const { constructNode: constructOutput } = require('./construct-output');
const { RETURN_NODE_WITH_RELS, createRelationships } = require('./cypher');

const create = async input => {
	const {
		clientId,
		requestId,
		upsert,
		nodeType,
		code,
		attributes,
		relationships
	} = sanitizeInput(input, 'CREATE');

	await preflightChecks.bailOnDeletedNode({ nodeType, code, status: 409 });
	console.log('CREATE IS CALLED')
	try {
		const timestamp = new Date().getTime();

		const queryParts = [
			`CREATE (node:${nodeType} $attributes)
				SET node._createdByRequest = $requestId, node._createdByClient = $clientId,
					node._createdTimestamp = ${timestamp},
					node._updatedByRequest = $requestId,
					node._updatedByClient = $clientId,
					node._updatedTimestamp = ${timestamp}
				DELETE node.requestId, node.clientId
			WITH node`
		];
		if (relationships.length) {
			queryParts.push(...createRelationships(upsert, relationships));
		}
		queryParts.push(RETURN_NODE_WITH_RELS);

		const query = queryParts.join('\n');
		logger.info({
			event: 'CREATE_NODE_QUERY',
			clientId,
			requestId,
			nodeType,
			code,
			query
		});
		const result = await db.run(query, { attributes, clientId, requestId });

		logChanges(clientId, requestId, result);
		return constructOutput(result);
	} catch (err) {
		dbErrorHandlers.duplicateNode(err, nodeType, code);
		dbErrorHandlers.nodeUpsert(err, relationships);
		throw err;
	}
};

const read = async input => {
	const { clientId, requestId, nodeType, code } = sanitizeInput(input, 'READ');

	await preflightChecks.bailOnDeletedNode({ nodeType, code });

	const query = stripIndents`
	MATCH (node:${nodeType} {code: $code})
	${RETURN_NODE_WITH_RELS}`;

	logger.info({
		event: 'READ_NODE_QUERY',
		clientId,
		requestId,
		nodeType,
		code,
		query
	});

	const result = await db.run(query, { code });
	queryResultHandlers.missingNode({ result, nodeType, code, status: 404 });
	return constructOutput(result);
};

const update = async input => {
	const {
		clientId,
		requestId,
		upsert,
		nodeType,
		code,
		attributes,
		relationships,
		deletedAttributes,
		relationshipAction,
		relationshipTypes
	} = sanitizeInput(input, 'UPDATE');

	let deletedRelationships;

	await preflightChecks.bailOnDeletedNode({ nodeType, code, status: 409 });

	try {
		const timestamp = new Date().getTime();
		const queryParts = [
			stripIndents`MERGE (node:${nodeType} { code: $code })
					ON CREATE SET
						node._createdByRequest = $requestId,
						node._createdByClient = $clientId,
						node._createdTimestamp = ${timestamp},
						node._updatedByRequest = $requestId,
						node._updatedByClient = $clientId,
						node._updatedTimestamp = ${timestamp}
					ON MATCH SET
						node._updatedByRequest = $requestId,
						node._updatedByClient = $clientId,
						node._updatedTimestamp = ${timestamp}
				SET node += $attributes
				DELETE node.requestId, node.clientId
				`
		];
		queryParts.push(...deletedAttributes.map(attr => `REMOVE node.${attr}`));

		if (relationships.length) {
			preflightChecks.bailOnMissingRelationshipAction(relationshipAction);

			if (relationshipAction === 'replace') {
				// If replacing we must retrieve information on existing relationships
				// for the log stream
				deletedRelationships = await db.run(
					stripIndents`
		MATCH (node:${nodeType} {code: $code})-[relationship${relationshipTypes
						.map(type => `:${type}`)
						.join('|')}]-(related)
		RETURN node, relationship, related`,
					{ code }
				);

				if (deletedRelationships.records.length) {
					// removal
					queryParts.push(
						...relationshipTypes.map(
							type => stripIndents`
						WITH node
						OPTIONAL MATCH (node)-[rel:${type}]-(related)
						DELETE rel`
						)
					);
				}
			}

			queryParts.push(...createRelationships(upsert, relationships));
		}
		queryParts.push(RETURN_NODE_WITH_RELS);

		const query = queryParts.join('\n');

		logger.info({
			event: 'UPDATE_NODE_QUERY',
			clientId,
			requestId,
			nodeType,
			code,
			query,
			attributes
		});
		const result = await db.run(query, {
			attributes,
			code,
			requestId,
			clientId
		});

		logChanges(clientId, requestId, result, deletedRelationships);
		return {
			data: constructOutput(result),
			status:
				result.records[0].get('node').properties._createdByRequest === requestId
					? 201
					: 200
		};
	} catch (err) {
		dbErrorHandlers.nodeUpsert(err, relationships);
		throw err;
	}
};

const remove = async input => {
	const { clientId, requestId, nodeType, code } = sanitizeInput(
		input,
		'DELETE'
	);
	// note - this calls bailOnDeletedNode, which is why it isn't done explicitly
	// in this function
	const record = await read(input);

	queryResultHandlers.attachedNode({ record, nodeType, code });

	const query = stripIndents`
	MATCH (node:${nodeType} {code: $code})
	SET node.isDeleted = true, node.deletedByRequest = $requestId
	RETURN node`;

	logger.info({ event: 'REMOVE_NODE_QUERY', requestId, nodeType, code, query });

	const result = await db.run(query, { code, clientId, requestId });
	queryResultHandlers.missingNode({ result, nodeType, code, status: 404 });
	logChanges(clientId, requestId, result);

	return { status: 204 };
};

module.exports = { create, read, update, delete: remove };

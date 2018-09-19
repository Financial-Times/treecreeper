const { stripIndents } = require('common-tags');
const { logger } = require('../lib/request-context');
const { executeQuery, writeTransaction } = require('../lib/db-connection');
const {
	dbErrorHandlers,
	queryResultHandlers,
	preflightChecks
} = require('./errors');
const { logNodeChanges: logChanges } = require('./kinesis');
const { sanitizeNode: sanitizeInput } = require('./sanitize-input');
const { constructNode: constructOutput } = require('./construct-output');
const {
	metaAttributesForCreate,
	metaAttributesForUpdate,
	RETURN_NODE_WITH_RELS,
	createRelationships
} = require('./cypher');

const {
	batchRelationships,
	constructRelationshipMergeQueries
} = require('./relationship-batcher');

const salesforceSync = require('../lib/salesforce-sync');

const getNodeWithRelationships = async (nodeType, code) => {
	const query = stripIndents`
	MATCH (node:${nodeType} {code: $code})
	${RETURN_NODE_WITH_RELS}`;
	return executeQuery(query, { code });
};

const executeWriteWithRelationships = async ({
	input: {
		clientId,
		requestId,
		nodeType,
		upsert,
		code,
		attributes,
		relationships
	},
	queryParts,
	eventName,
	baseParameters,
	deletedRelationships
}) => {
	const parameters = Object.assign(
		{
			attributes
		},
		baseParameters
	);

	const batchedRelationships = batchRelationships(relationships);

	const supplementaryQueries = constructRelationshipMergeQueries(
		upsert,
		batchedRelationships.slice(1),
		nodeType,
		baseParameters
	);

	queryParts.push(
		createRelationships(upsert, batchedRelationships[0], parameters)
	);

	queryParts.push(RETURN_NODE_WITH_RELS);

	const query = queryParts.join('\n');

	logger.info({
		event: eventName,
		clientId,
		requestId,
		nodeType,
		code,
		attributes
	});

	let result;

	if (supplementaryQueries.length) {
		await writeTransaction([
			{
				query,
				params: parameters
			},
			// nested array rather than concatenated because supplementaryQueries
			// can all run in parallel
			supplementaryQueries || []
		]);
		result = await getNodeWithRelationships(nodeType, code);
	} else {
		result = await executeQuery(query, parameters);
	}

	logChanges(clientId, requestId, result, deletedRelationships);
	const responseData = constructOutput(result);

	// HACK: While salesforce also exists as a rival source of truth for Systems,
	// we sync with it here. Don't like it being in here as the api should be agnostic
	// in how it handles types, but a little hack in here feels preferable to managing
	// another update stream consumer, particularly while avoiding race conditions when
	// migrating from cmdb
	if (nodeType === 'System') {
		salesforceSync.setSalesforceIdForSystem(responseData);
	}

	return responseData;
};

const create = async input => {
	const sanitizedInput = sanitizeInput(input, 'CREATE');
	const { clientId, requestId, nodeType, code, relationships } = sanitizedInput;

	try {
		const baseParameters = {
			clientId,
			date: new Date().toUTCString(),
			requestId,
			code
		};

		const queryParts = [
			`CREATE (node:${nodeType} $attributes)
				SET
				${metaAttributesForCreate('node')}
			WITH node`
		];

		return await executeWriteWithRelationships({
			input: sanitizedInput,
			queryParts,
			eventName: 'CREATE_NODE_QUERY',
			baseParameters
		});
	} catch (err) {
		dbErrorHandlers.duplicateNode(err, nodeType, code);
		dbErrorHandlers.nodeUpsert(err, relationships);
		throw err;
	}
};

const read = async input => {
	const includeRelNames = input.query.includeRelNames;
	const { clientId, requestId, nodeType, code, queryParams } = sanitizeInput(
		input,
		'READ'
	);

	logger.info({
		event: 'READ_NODE_QUERY',
		clientId,
		requestId,
		nodeType,
		code,
		queryParams
	});
	if (includeRelNames) {
		logger.info({
			clientId,
			date: new Date().toUTCString(),
			requestId,
			event: 'REL_NAMES_REQUESTED'
		});
	}

	const result = await getNodeWithRelationships(nodeType, code);

	queryResultHandlers.missingNode({ result, nodeType, code, status: 404 });
	return constructOutput(result, includeRelNames);
};

const update = async input => {
	const sanitizedInput = sanitizeInput(input, 'UPDATE');
	const {
		clientId,
		requestId,
		nodeType,
		code,
		relationships,
		deletedAttributes,
		relationshipAction,
		relationshipTypes
	} = sanitizedInput;

	let deletedRelationships;

	try {
		const baseParameters = {
			clientId,
			date: new Date().toUTCString(),
			requestId,
			code
		};

		const queryParts = [
			stripIndents`MERGE (node:${nodeType} { code: $code })
					ON CREATE SET
						${metaAttributesForCreate('node')}
					ON MATCH SET
						${metaAttributesForUpdate('node')}
					SET node += $attributes
				`
		];
		queryParts.push(...deletedAttributes.map(attr => `REMOVE node.${attr}`));

		if (relationships.length) {
			preflightChecks.bailOnMissingRelationshipAction(relationshipAction);

			if (relationshipAction === 'replace') {
				// If replacing we must retrieve information on existing relationships
				// for the log stream
				deletedRelationships = await executeQuery(
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
						stripIndents`
						WITH node
						OPTIONAL MATCH (node)-[deletableRel:${relationshipTypes.join('|')}]-(related)
						DELETE deletableRel`
					);
				}
			}
		}

		const data = await executeWriteWithRelationships({
			input: sanitizedInput,
			queryParts,
			eventName: 'UPDATE_NODE_QUERY',
			baseParameters,
			deletedRelationships
		});

		return {
			data,
			status: data.node._createdByRequest === requestId ? 201 : 200
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
	const existingRecord = await getNodeWithRelationships(nodeType, code);

	queryResultHandlers.missingNode({
		result: existingRecord,
		nodeType,
		code,
		status: 404
	});
	queryResultHandlers.attachedNode({ result: existingRecord, nodeType, code });

	const query = stripIndents`
	MATCH (node:${nodeType} {code: $code})
	WITH {properties: properties(node), labels: labels(node)} AS deletedNode, node
	DELETE node
	RETURN deletedNode as node`;

	logger.info({ event: 'REMOVE_NODE_QUERY', requestId, nodeType, code });

	const result = await executeQuery(query, { code, clientId, requestId });
	result.records[0].get('node').properties.deletedByRequest = requestId; // ensure requestID is present
	logChanges(clientId, requestId, result);

	return { status: 204 };
};

module.exports = { create, read, update, delete: remove };

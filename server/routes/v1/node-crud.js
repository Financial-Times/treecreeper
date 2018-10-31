const { stripIndents } = require('common-tags');
const { logger } = require('../../lib/request-context');
const { executeQuery, writeTransaction } = require('../../data/db-connection');
const {
	dbErrorHandlers,
	queryResultHandlers,
	preflightChecks
} = require('./helpers/errors');
const { logNodeChanges: logChanges } = require('./helpers/log-to-kinesis');
const { sanitizeNode: sanitizeInput } = require('./helpers/sanitize-input');
const {
	constructNode: constructOutput
} = require('./helpers/construct-output');
const {
	metaAttributesForCreate,
	metaAttributesForUpdate,
	RETURN_NODE_WITH_RELS,
	createRelationships
} = require('../../data/cypher-fragments');

const {
	batchRelationships,
	constructRelationshipMergeQueries
} = require('../../data/relationship-batcher');

const salesforceSync = require('../../lib/salesforce-sync');

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
	const { clientId, requestId, nodeType, code } = sanitizeInput(input, 'READ');

	logger.info({
		event: 'READ_NODE_QUERY',
		clientId,
		requestId,
		nodeType,
		code
	});

	const result = await getNodeWithRelationships(nodeType, code);

	queryResultHandlers.missingNode({ result, nodeType, code, status: 404 });
	return constructOutput(result);
};

const nodeDiff = (existingNode = {}, newNode = {}) => {
	return Object.entries(newNode)
		.filter(([propName, value]) => existingNode[propName] !== value)
		.map(([propName]) => propName);
};

const hasNoEquivalentIn = (arr = []) => item => {
	const keys = Object.keys(item);
	return !arr.some(refItem => keys.every(key => item[key] === refItem[key]));
};

const relationshipDiff = (
	existingRelationships = {},
	newRelationships = {},
	action
) => {
	return Object.keys(newRelationships)
		.map(relType =>
			// additions
			newRelationships[relType]
				.filter(hasNoEquivalentIn(existingRelationships[relType]))
				.concat(
					action === 'replace' && existingRelationships[relType]
						? // deletions when doing replace
						  existingRelationships[relType].filter(
								hasNoEquivalentIn(newRelationships[relType])
						  )
						: []
				)
		)
		.filter(diff => diff.length);
};

const update = async input => {
	const sanitizedInput = sanitizeInput(input, 'UPDATE');
	const {
		clientId,
		requestId,
		nodeType,
		code,
		relationships,
		attributes,
		deletedAttributes,
		relationshipAction,
		relationshipTypes
	} = sanitizedInput;

	let deletedRelationships;

	try {
		if (relationships.length) {
			preflightChecks.bailOnMissingRelationshipAction(relationshipAction);
		}
		const prefetch = await getNodeWithRelationships(nodeType, code);

		const existingRecord = prefetch.records.length
			? constructOutput(prefetch)
			: {};

		let hasChanged = false;

		if (deletedAttributes.length) {
			hasChanged = true;
		}

		const changedAttributes = nodeDiff(existingRecord.node, attributes);

		if (changedAttributes.length) {
			hasChanged = true;
		}

		if (!hasChanged && relationships.length) {
			const diff = relationshipDiff(
				existingRecord.relationships,
				input.relationships,
				relationshipAction
			);
			if (diff.length) {
				hasChanged = true;
			}
		}

		if (!hasChanged) {
			logger.info(
				{ event: 'SKIP_NODE_UPDATE' },
				'No changed properties or relationships - skipping node update'
			);
			return existingRecord;
		}

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

const httpErrors = require('http-errors');
const { validateInput } = require('./lib/validation');
const { logger } = require('../api-core/lib/request-context');
const { executeQuery } = require('./lib/neo4j-model');
const { diffProperties } = require('./lib/diff-properties');
const { getType } = require('../schema-sdk');
const { prepareRelationshipDeletion } = require('./lib/relationships/write');
const { getNeo4jRecordCypherQuery } = require('./lib/read-helpers');
const {
	getRemovedRelationships,
	getAddedRelationships,
} = require('./lib/relationships/input');

// TODO: these functions should be loaded via api-core or this package inside
const {
	logNodeChanges,
	logNodeDeletion,
} = require('../../api/server/lib/log-to-kinesis');

const fetchNode = async (nodeType, code) => {
	const query = `MATCH (node:${nodeType} { code: $code })
		${getNeo4jRecordCypherQuery()}`;

	const node = await executeQuery(query, { code }, true);
	if (!node.records.length) {
		throw httpErrors(404, `${nodeType} record missing for \`${code}\``);
	}
	return node;
};

const mergeRelationships = async (nodeType, sourceCode, destinationCode) => {
	const query = [
		`OPTIONAL MATCH (sourceNode:${nodeType} { code: $sourceCode }), (destinationNode:${nodeType} { code: $destinationCode })`,
		'CALL apoc.refactor.mergeNodes([destinationNode, sourceNode], { properties:"discard", mergeRels:true })',
		'YIELD node',
		getNeo4jRecordCypherQuery({ includeWithStatement: false }),
	];

	return executeQuery(
		query.join('\n'),
		{ sourceCode, destinationCode },
		true,
	);
};

// e.g POST /v2/{nodeType}/{code}/absorb/{otherCode}
// Absorbs {otherCode} >>> {code}, then {otherCode} relationships is merged to {code}
const absorbHandler = ({ documentStore } = {}) => async input => {
	const {
		type: nodeType,
		code: destinationCode,
		otherCode: sourceCode,
	} = validateInput(input);

	// Fetch the nodes to be updated
	const [sourceNode, destinationNode] = await Promise.all([
		fetchNode(nodeType, sourceCode),
		fetchNode(nodeType, destinationCode),
	]);
	const sourceRecord = sourceNode.toJson(nodeType, true);
	const destinationRecord = destinationNode.toJson(nodeType, true);

	const writeProperties = diffProperties({
		type: nodeType,
		newContent: sourceRecord,
		initialContent: destinationRecord,
	});
	const { properties } = getType(nodeType);
	Object.keys(sourceRecord).forEach(name => {
		if (name in destinationRecord) {
			delete writeProperties[name];
		}
		// covers the case where properties exist on the node but not the schema
		// and avoids an update event being sent
		if (!(name in properties)) {
			delete writeProperties[name];
		}
	});

	const possibleReflections = Object.entries(properties)
		.filter(([, { type: otherType }]) => nodeType === otherType)
		.map(([propName]) => propName);

	const removedRelationships = getRemovedRelationships({
		type: nodeType,
		initialContent: sourceRecord,
		newContent: destinationRecord,
		action: 'merge',
	});

	const willRemoveRelationShips = possibleReflections.reduce(
		(propName, removed) => {
			const sourceProp = sourceRecord[propName];
			if (!sourceProp || !sourceProp.includes(destinationCode)) {
				return removedRelationships;
			}
			removed[propName] = [...(removed[propName] || []), destinationCode];
			return removed;
		},
		removedRelationships,
	);

	// Check and delete relationships if we need
	if (Object.keys(willRemoveRelationShips).length) {
		const queryParts = [`MATCH (node: ${nodeType} { code: $code })`];
		const {
			parameters,
			queryParts: deleteRelationshipQueries,
		} = prepareRelationshipDeletion(nodeType, willRemoveRelationShips);

		await executeQuery(
			[...queryParts, ...deleteRelationshipQueries].join('\n'),
			Object.assign({}, parameters, { code: sourceCode }),
		);
		logNodeChanges({
			result: sourceNode,
			removedRelationships: willRemoveRelationShips,
		});
	}
	const {
		body: updatedBody = {},
		undo: undoS3Merge = async () => ({}),
	} = await documentStore.merge(nodeType, sourceCode, destinationCode);

	let result;
	try {
		// Merge relationships in Neo4j
		result = await mergeRelationships(
			nodeType,
			sourceCode,
			destinationCode,
		);
	} catch (err) {
		logger.info(
			{ event: `MERGE_NEO4J_FAILURE` },
			err,
			`Neo4j merge unsuccessful, attempting to rollback S3`,
		);
		// Undo S3 actions
		undoS3Merge();
	}

	const addedRelationships = getAddedRelationships({
		type: nodeType,
		initialContent: destinationRecord,
		newContent: result.toJson(nodeType, true),
	});
	logNodeDeletion(sourceNode.getNode());
	logNodeChanges({
		result,
		updatedProperties: [
			...new Set([
				...Object.keys(writeProperties),
				...Object.keys(addedRelationships || {}),
			]),
		],
		addedRelationships,
	});

	const body = Object.assign({}, result.toJson(nodeType, true), updatedBody);
	return {
		status: 200,
		body: Object.keys(body).reduce((filteredBody, key) => {
			if (key in properties) {
				filteredBody[key] = body[key];
			}
			return filteredBody;
		}, {}),
	};
};

module.exports = {
	absorbHandler,
};

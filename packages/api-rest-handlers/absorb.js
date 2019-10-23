const httpErrors = require('http-errors');
const { validateInput, validateCode } = require('./lib/validation');
const { logger } = require('../api-express/lib/request-context');
const { executeQuery } = require('./lib/neo4j-model');
const { diffProperties } = require('./lib/diff-properties');
const { getType } = require('../schema-sdk');
const { prepareRelationshipDeletion } = require('./lib/relationships/write');
const { getNeo4jRecordCypherQuery } = require('./lib/read-helpers');
const { getRemovedRelationships } = require('./lib/relationships/input');

const fetchNode = async (nodeType, code, paramName = 'code') => {
	const query = `MATCH (node:${nodeType} { code: $${paramName} })
		${getNeo4jRecordCypherQuery()}`;

	const node = await executeQuery(query, { [paramName]: code }, true);
	if (!node.records.length) {
		throw httpErrors(
			404,
			`${nodeType} record missing for \`${paramName}\``,
		);
	}
	return node;
};

const mergeRelationships = async (nodeType, absorbedCode, code) => {
	const query = [
		`OPTIONAL MATCH (absorbedNode:${nodeType} { code: $absorbedCode }), (mainNode:${nodeType} { code: $code })`,
		'CALL apoc.refactor.mergeNodes([mainNode, absorbedNode], { properties:"discard", mergeRels:true })',
		'YIELD node',
		getNeo4jRecordCypherQuery({ includeWithStatement: false }),
	];

	return executeQuery(query.join('\n'), { absorbedCode, code }, true);
};

const removeRelationships = async (
	nodeType,
	absorbedCode,
	removedRelationships,
) => {
	const queryParts = [`MATCH (node:${nodeType} { code: $code })`];
	const {
		parameters,
		queryParts: deleteRelationshipQueries,
	} = prepareRelationshipDeletion(nodeType, removedRelationships);

	const queries = [
		...queryParts,
		...deleteRelationshipQueries,
		'RETURN node',
	];
	await executeQuery(
		queries.join('\n'),
		Object.assign({}, parameters, { code: absorbedCode }),
	);
};

const getWriteProperties = ({
	nodeType,
	properties,
	absorbedRecord,
	mainRecord,
}) => {
	const writeProperties = diffProperties({
		type: nodeType,
		newContent: absorbedRecord,
		initialContent: mainRecord,
	});
	Object.keys(absorbedRecord).forEach(name => {
		if (name in mainRecord) {
			delete writeProperties[name];
		}
		// covers the case where properties exist on the node but not the schema
		// and avoids an update event being sent
		if (!(name in properties)) {
			delete writeProperties[name];
		}
	});
	return writeProperties;
};

const collectRemovedRelationships = ({
	nodeType,
	code,
	properties,
	absorbedRecord,
	mainRecord,
}) => {
	const removedRelationships = getRemovedRelationships({
		type: nodeType,
		initialContent: absorbedRecord,
		newContent: mainRecord,
		action: 'merge',
	});

	const possibleReflections = Object.entries(properties)
		.filter(([, { type: otherType }]) => nodeType === otherType)
		.map(([name]) => name);

	possibleReflections.forEach(propName => {
		if (!(propName in absorbedRecord)) {
			return;
		}
		if (!absorbedRecord[propName].includes(code)) {
			return;
		}
		if (removedRelationships[propName]) {
			removedRelationships[propName].push(code);
		} else {
			removedRelationships[propName] = [code];
		}
	});

	return removedRelationships;
};

// e.g POST /v2/{nodeType}/{code}/absorb/{otherCode}
// Absorbs {otherCode} >>> {code}, then {otherCode} relationships is merged to {code}
const absorbHandler = ({ documentStore } = {}) => async input => {
	const { type: nodeType, code, codeToAbsorb: absorbedCode } = validateInput(
		input,
	);
	validateCode(nodeType, absorbedCode, 'codeToAbsorb');

	// Fetch nodes to be updated
	const [mainNode, absorbedNode] = await Promise.all([
		fetchNode(nodeType, code),
		fetchNode(nodeType, absorbedCode, 'codeToAbsorb'),
	]);
	const mainRecord = mainNode.toJson(nodeType, true);
	const absorbedRecord = absorbedNode.toJson(nodeType, true);
	const { properties } = getType(nodeType);

	// This object will be used for logging
	// eslint-disable-next-line no-unused-vars
	const writeProperties = getWriteProperties({
		nodeType,
		properties,
		absorbedRecord,
		mainRecord,
	});

	const removedRelationships = collectRemovedRelationships({
		nodeType,
		code,
		properties,
		absorbedRecord,
		mainRecord,
	});

	// Remove relationships for absorbed code if exists
	if (Object.keys(removedRelationships).length > 0) {
		await removeRelationships(nodeType, absorbedCode, removedRelationships);
	}

	const {
		body: updatedBody = {},
		undo: undoS3Merge = async () => ({}),
	} = await documentStore.absorb(nodeType, absorbedCode, code);

	let result;
	try {
		// Merge Neo4j relationships
		result = await mergeRelationships(nodeType, absorbedCode, code);
	} catch (err) {
		logger.info(
			{ event: `MERGE_NEO4J_FAILURE` },
			err,
			`Neo4j merge unsuccessful, attempting to rollback S3`,
		);
		// Undo S3 actions
		undoS3Merge();
	}

	const body = Object.assign({}, result.toJson(nodeType), updatedBody);
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

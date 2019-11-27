const httpErrors = require('http-errors');
const { logger } = require('@financial-times/tc-api-express-logger');
const { logChanges } = require('@financial-times/tc-api-publish');
const { getType } = require('@financial-times/tc-schema-sdk');
const {
	executeQuery,
	executeQueryWithTransaction,
} = require('./lib/neo4j-model');
const { validateInput, validateCode } = require('./lib/validation');
const { diffProperties } = require('./lib/diff-properties');
const { prepareRelationshipDeletion } = require('./lib/relationships/write');
const { getNeo4jRecordCypherQuery } = require('./lib/read-helpers');
const { getRemovedRelationships } = require('./lib/relationships/input');
const {
	metaPropertiesForUpdate,
	prepareMetadataForNeo4jQuery,
} = require('./lib/metadata-helpers');

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

const createMergeRelationshipsQuery = ({
	nodeType,
	absorbedCode,
	code,
	metadata,
}) => {
	const query = `OPTIONAL MATCH (absorbedNode:${nodeType} { code: $absorbedCode }), (mainNode:${nodeType} { code: $code })
		CALL apoc.refactor.mergeNodes([mainNode, absorbedNode], { properties:"discard", mergeRels:true })
		YIELD node
		SET ${metaPropertiesForUpdate('node')}
		${getNeo4jRecordCypherQuery({ includeWithStatement: true })}`;

	return {
		query,
		parameters: {
			absorbedCode,
			code,
			...prepareMetadataForNeo4jQuery(metadata),
		},
	};
};

const createRemoveRelationshipsQuery = ({
	nodeType,
	absorbedCode,
	removedRelationships,
}) => {
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
	return {
		query: queries.join('\n'),
		parameters: {
			...parameters,
			code: absorbedCode,
		},
	};
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
	const {
		type: nodeType,
		code,
		codeToAbsorb: absorbedCode,
		query: { richRelationships } = {},
		metadata,
	} = validateInput(input);
	validateCode(nodeType, absorbedCode, 'codeToAbsorb');

	// Fetch nodes to be updated
	const [mainNode, absorbedNode] = await Promise.all([
		fetchNode(nodeType, code),
		fetchNode(nodeType, absorbedCode, 'codeToAbsorb'),
	]);
	const mainRecord = mainNode.toJson({ type: nodeType, excludeMeta: true });
	const absorbedRecord = absorbedNode.toJson({
		type: nodeType,
		excludeMeta: true,
	});
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

	let updatedDocstoreBody;
	let undoDocstoreWrite;

	if (documentStore) {
		const { body, undo } = await documentStore.absorb(
			nodeType,
			absorbedCode,
			code,
		);
		updatedDocstoreBody = body || {};
		undoDocstoreWrite = undo;
	}

	let result;
	try {
		const queries = [];

		if (Object.keys(removedRelationships).length > 0) {
			queries.push(
				createRemoveRelationshipsQuery({
					nodeType,
					absorbedCode,
					removedRelationships,
				}),
			);
		}

		queries.push(
			createMergeRelationshipsQuery({
				nodeType,
				absorbedCode,
				code,
				metadata,
			}),
		);

		// Entire queries which affects current node should run in transaction.
		// So we stack queries and execute all at once
		const results = await executeQueryWithTransaction(...queries);

		// Merged result always exists at last index
		result = results.pop();

		logChanges('UPDATE', result, {
			relationships: {
				removed: removedRelationships,
			},
		});
		logChanges('DELETE', absorbedNode);
	} catch (err) {
		logger.info(
			{ event: `MERGE_NEO4J_FAILURE` },
			err,
			`Neo4j merge unsuccessful, attempting to rollback S3`,
		);
		if (undoDocstoreWrite) {
			undoDocstoreWrite();
		}
	}

	const body = {
		...result.toJson({
			type: nodeType,
			richRelationshipsFlag: richRelationships,
		}),
		...updatedDocstoreBody,
	};
	return {
		status: 200,
		body: Object.keys(body).reduce((filteredBody, key) => {
			// HACK: We need to provide a definitive reference for metaproperties
			// somewhere that various parts of the code base can chek against.
			// probably in SDK
			if (key in properties || key.charAt(0) === '_') {
				filteredBody[key] = body[key];
			}
			return filteredBody;
		}, {}),
	};
};

module.exports = {
	absorbHandler,
};

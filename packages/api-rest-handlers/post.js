const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const _isEmpty = require('lodash.isempty');
const { executeQuery } = require('./lib/neo4j-model');
const { validateInput } = require('./lib/validation');
// const { getNeo4jRecord } = require('./lib/read-helpers');
const { getType } = require('../schema-sdk');

const {
	metaPropertiesForCreate,
	prepareMetadataForNeo4jQuery,
} = require('./lib/metadata-helpers');

const { getRelationships } = require('./lib/relationships/input');

const { constructNeo4jProperties } = require('./lib/neo4j-type-conversion');
const {
	prepareToWriteRelationships,
	handleUpsertError,
} = require('./lib/relationships/write');
const { getNeo4jRecordCypherQuery } = require('./lib/read-helpers');

const separateDocsFromBody = (nodeType, body) => {
	const { properties } = getType(nodeType);
	const bodyDocuments = {};
	const bodyNoDocs = {};

	Object.entries(body).forEach(([key, value]) => {
		if (!_isEmpty(value)) {
			if (properties[key].type === 'Document') {
				bodyDocuments[key] = body[key];
			} else {
				bodyNoDocs[key] = body[key];
			}
		}
	});

	return { bodyDocuments, bodyNoDocs };
};

const postHandler = ({ documentStore } = {}) => async input => {
	let versionId;
	let newBodyDocs;
	const { type, code, body, metadata = {}, query = {} } = validateInput(
		input,
	);

	const { bodyDocuments, bodyNoDocs } = separateDocsFromBody(type, body);

	if (!_isEmpty(bodyDocuments)) {
		({ versionId, newBodyDocs } = await documentStore.post(
			type,
			code,
			bodyDocuments,
		));
	} else {
		// logger.info(
		// 	{ event: 'SKIP_S3_UPDATE' },
		// 	'No changed Document properties - skipping update',
		// );
	}

	const { createPermissions, pluralName } = getType(type);
	if (createPermissions && !createPermissions.includes(metadata.clientId)) {
		throw httpErrors(
			400,
			`${pluralName} can only be created by ${createPermissions.join(
				', ',
			)}`,
		);
	}

	const queryParts = [
		stripIndents`
			CREATE (node:${type} $properties)
				SET ${metaPropertiesForCreate('node')}
			WITH node`,
	];

	const properties = constructNeo4jProperties({
		type,
		body: bodyNoDocs,
		code,
	});
	const relationshipsToCreate = getRelationships({
		type,
		body: bodyNoDocs,
	});

	const {
		relationshipParameters,
		relationshipQueries,
	} = prepareToWriteRelationships(type, relationshipsToCreate, query.upsert);

	const parameters = Object.assign(
		{
			code,
			properties,
		},
		prepareMetadataForNeo4jQuery(metadata),
		relationshipParameters,
	);

	queryParts.push(...relationshipQueries, getNeo4jRecordCypherQuery());
	try {
		const neo4jResult = await executeQuery(
			queryParts.join('\n'),
			parameters,
		);

		const result = Object.assign({}, neo4jResult.toJson(type), newBodyDocs);

		return { status: 200, body: result };
	} catch (err) {
		if (!_isEmpty(bodyDocuments) && versionId) {
			// logger.info(
			// 	{ event: `${method}_NEO4J_FAILURE` },
			// 	err,
			// 	`${method}: neo4j write unsuccessful, attempting to rollback S3 write`,
			// );
			documentStore.delete(type, code, versionId);
		}

		if (/already exists with label/.test(err.message)) {
			throw httpErrors(409, `${type} ${code} already exists`);
		}
		handleUpsertError(err);
		throw err;
	}
};

module.exports = { postHandler };

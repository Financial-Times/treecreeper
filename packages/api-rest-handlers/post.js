const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const _isEmpty = require('lodash.isempty');
const { executeQuery } = require('./lib/neo4j-model');
const { validateInput } = require('./lib/validation');
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
const { separateDocsFromBody } = require('./lib/separate-documents-from-body');

const postHandler = ({ documentStore } = {}) => async input => {
	const {
		type,
		code,
		body: originalBody,
		metadata = {},
		query = {},
	} = validateInput(input);

	const { documents = {}, body } = documentStore
		? separateDocsFromBody(type, originalBody)
		: { body: originalBody };

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
		body,
		code,
	});
	const relationshipsToCreate = getRelationships({
		type,
		body,
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

	const { body: newBodyDocs = {}, undo: undoDocstoreWrite } = !_isEmpty(
		documents,
	)
		? await documentStore.post(type, code, documents)
		: {};

	try {
		const neo4jResult = await executeQuery(
			queryParts.join('\n'),
			parameters,
		);

		const responseData = Object.assign(
			neo4jResult.toJson(type),
			newBodyDocs,
		);

		return { status: 200, body: responseData };
	} catch (err) {
		if (undoDocstoreWrite) {
			await undoDocstoreWrite();
		}

		if (/already exists with label/.test(err.message)) {
			throw httpErrors(409, `${type} ${code} already exists`);
		}
		handleUpsertError(err);
		throw err;
	}
};

module.exports = { postHandler };

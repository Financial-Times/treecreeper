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
const { setLockFields } = require('./lib/locked-fields');

const buildNeo4jPostQuery = ({
	type,
	code,
	properties,
	metadata,
	lockedFields,
	upsert,
	relationshipsToCreate,
}) => {
	const baseQuery = stripIndents`
		CREATE (node:${type} $properties)
		SET ${metaPropertiesForCreate('node')}
		WITH node`;

	const {
		relationshipParameters,
		relationshipQueries,
	} = prepareToWriteRelationships(type, relationshipsToCreate, upsert);

	const neo4jQuery = [
		baseQuery,
		...relationshipQueries,
		getNeo4jRecordCypherQuery(),
	].join('\n');

	if (Object.keys(lockedFields).length) {
		properties = {
			...properties,
			_lockedFields: JSON.stringify(lockedFields),
		};
	}
	const parameters = {
		...{ code, properties },
		...prepareMetadataForNeo4jQuery(metadata),
		...relationshipParameters,
	};

	// TODO: Best point of logging neo4j query if we need

	return {
		neo4jQuery,
		parameters,
	};
};

const postHandler = ({
	documentStore = { post: () => ({}) },
} = {}) => async input => {
	const {
		type,
		code,
		body,
		metadata = {},
		query: { upsert, lockFields } = {},
	} = validateInput(input);
	const { clientId } = metadata;

	const { bodyDocuments, bodyNoDocs } = separateDocsFromBody(type, body);

	const { createPermissions, pluralName } = getType(type);
	if (createPermissions && !createPermissions.includes(clientId)) {
		throw httpErrors(
			400,
			`${pluralName} can only be created by ${createPermissions.join(
				', ',
			)}`,
		);
	}

	const properties = constructNeo4jProperties({
		type,
		body: bodyNoDocs,
		code,
	});

	const relationshipsToCreate = getRelationships({
		type,
		body: bodyNoDocs,
	});

	const lockedFields = setLockFields(clientId, lockFields, bodyDocuments);

	const { neo4jQuery, parameters } = buildNeo4jPostQuery({
		type,
		code,
		properties,
		metadata,
		lockedFields,
		upsert,
		relationshipsToCreate,
	});

	const { body: newBodyDocs = {}, undo: undoDocstoreWrite } = !_isEmpty(
		bodyDocuments,
	)
		? await documentStore.post(type, code, bodyDocuments)
		: {};

	try {
		const neo4jResult = await executeQuery(neo4jQuery, parameters);

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

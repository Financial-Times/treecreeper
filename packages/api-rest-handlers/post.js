const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const { executeQuery } = require('./lib/neo4j-model');
const { validateInput } = require('./lib/validation');
const { getNeo4jRecord } = require('./lib/read-helpers');
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

const postHandler = ({ documentStore } = {}) => async input => {
	const {
		type,
		code,
		body,
		metadata = {},
		query = {},
		skipPreflight = false,
		responseStatus = 200,
	} = validateInput(input);

	const { createPermissions, pluralName } = getType(type);
	if (createPermissions && !createPermissions.includes(metadata.clientId)) {
		throw httpErrors(
			400,
			`${pluralName} can only be created by ${createPermissions.join(
				', ',
			)}`,
		);
	}

	// when PATCH calls POST handler after first detecting there
	// is no existing record
	if (!skipPreflight) {
		const preflightRequest = await getNeo4jRecord(type, code);

		if (preflightRequest.hasRecords()) {
			throw httpErrors(409, `${type} ${code} already exists`);
		}
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
	try {
		const neo4jResult = await executeQuery(
			queryParts.join('\n'),
			parameters,
		);
		return { status: responseStatus, body: neo4jResult.toJson(type) };
	} catch (err) {
		handleUpsertError(err);
		throw err;
	}
};

module.exports = { postHandler };

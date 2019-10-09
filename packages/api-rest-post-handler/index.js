const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const { getNeo4jRecord } = require('../api-core');
const { executeQuery } = require('../api-core/lib/neo4j-model');
const { validateInput } = require('../api-core/lib/validation');
const { getType } = require('../schema-sdk');

const {
	metaPropertiesForCreate,
	getDbWriteContext,
} = require('../api-core/lib/metadata-helpers');

const {
	getRelationships,
} = require('../api-core/lib/diff-helpers');
const {
	constructNeo4jProperties,
} = require('../api-core/lib/neo4j-type-conversion');
const {
	prepareToWriteRelationships,
} = require('../api-core/lib/relationship-write-helpers');
const {
	getNeo4jRecordCypherQuery,
} = require('../api-core/lib/read-helpers');

const postHandler = ({ documentStore } = {}) => async input => {
	const { type, code, body, metadata, query = {} } = validateInput(input);

	const { createPermissions, pluralName } = getType(type);
	if (createPermissions && !createPermissions.includes(metadata.clientId)) {
		throw httpErrors(
			400,
			`${pluralName} can only be created by ${createPermissions.join(
				', ',
			)}`,
		);
	}

	const preflightRequest = await getNeo4jRecord(type, code);

	if (preflightRequest.hasRecords()) {
		throw httpErrors(409, `${type} ${code} already exists`);
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
		// TODO need to figure out the role of getContext() in general.
		// Hella useful for logging, but too clever by half for use in
		// application code? Makes code less pure and testable
		// DAMN YOU COMMON SENSE! Why must you ruin all my fun!
		Object.assign({}, getDbWriteContext(), metadata),
		relationshipParameters,
	);

	queryParts.push(...relationshipQueries, getNeo4jRecordCypherQuery());

	const neo4jResult = await executeQuery(queryParts.join('\n'), parameters);

	return { status: 200, body: neo4jResult.toJson(type) };
};

module.exports = { postHandler };

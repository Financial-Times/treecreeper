const { validateInput } = require('../../packages/api-core/lib/validation');
const { metaPropertiesForCreate } = require('../../packages/api-core/lib/metadata-helpers');
const { getType } = require('../../packages/schema-sdk');
const { getAddedRelationships } = require('../../packages/api-core/lib/diff-helpers');
const { constructNeo4jProperties } = require('../../packages/api-core/lib/neo4j-type-conversion');

const postHandler = ({ documentStore } = {}) => async input => {
	const { type, code, body, metadata, query } = validateInput(input);

	const { createPermissions, pluralName } = getType(nodeType);
	if (createPermissions && !createPermissions.includes(metadata.clientId)) {
		throw httpError(
			400,
			`${pluralName} can only be created by ${createPermissions.join(
				', ',
			)}`,
		);
	}

	const neo4jResult = await getNeo4jRecord(type, code);

	if (neo4jResult.hasRecords()) {
		throw httpErrors(409, `${type} ${code} already exists`);
	}

	const queryParts = [stripIndents`
			CREATE (node:${type} $properties)
				SET ${metaPropertiesForCreate('node')}
			WITH node`]

	const properties = constructNeo4jProperties({
		type,
		newContent: body,
		code,
	})

	const relationshipsToCreate = getAddedRelationships({
		type,
		newContent: bodyNoDocs,
	}),



};

module.exports = { postHandler };



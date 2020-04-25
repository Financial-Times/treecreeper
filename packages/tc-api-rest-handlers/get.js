const httpErrors = require('http-errors');
const { validateInput } = require('./lib/validation');
const { getNeo4jRecord } = require('./lib/read-helpers');

const getHandler = ({ documentStore } = {}) => async input => {
	// TODO validate that idField is a canIdentify field
	validateInput(input);

	const {
		type,
		code,
		query: { richRelationships, idField = 'code' } = {},
	} = input;

	const neo4jResult = await getNeo4jRecord(
		type,
		code,
		richRelationships,
		idField,
	);

	if (!neo4jResult.hasRecords()) {
		throw httpErrors(
			404,
			`${type} with ${idField} "${code}" does not exist`,
		);
	}

	if (idField !== 'code' && neo4jResult.hasMultipleRoots()) {
		throw httpErrors(
			409,
			`Multiple ${type} records with ${idField} "${code}" exist`,
		);
	}

	const neo4jResultAsJson = neo4jResult.toJson({
		type,
		richRelationshipsFlag: richRelationships,
	});

	const docstoreResult = documentStore
		? await documentStore.get(type, neo4jResultAsJson.code)
		: { body: {} };

	return {
		status: 200,
		body: { ...neo4jResultAsJson, ...docstoreResult.body },
	};
};

module.exports = { getHandler };

const httpErrors = require('http-errors');
const { validateInput } = require('./lib/validation');
const { getNeo4jRecord } = require('./lib/read-helpers');

const getHandler = ({ documentStore } = {}) => async input => {
	// TODO validate that idField is a canIdentify field
	validateInput(input);

	const { type, code, query: { richRelationships, idField } = {} } = input;

	const neo4jResult = await getNeo4jRecord(
		type,
		code,
		richRelationships,
		idField,
	);

	// TODO validate that only has a single root record
	if (!neo4jResult.hasRecords()) {
		throw httpErrors(404, `${type} ${code} does not exist`);
	}

	const neo4jResultAsJson = neo4jResult.toJson({
		type,
		richRelationshipsFlag: richRelationships,
	});

	const docstoreResult = documentStore
		? documentStore.get(type, neo4jResultAsJson.code)
		: { body: {} };

	return {
		status: 200,
		body: { ...neo4jResultAsJson, ...docstoreResult.body },
	};
};

module.exports = { getHandler };

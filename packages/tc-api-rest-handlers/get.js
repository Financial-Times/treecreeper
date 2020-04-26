const { validateInput } = require('./lib/validation');
const { getNeo4jRecord, checkForUniqueRecord } = require('./lib/read-helpers');

const getHandler = ({ documentStore } = {}) => async input => {
	validateInput(input);

	const {
		type,
		code,
		query: { richRelationships, idField = 'code' } = {},
	} = input;

	const neo4jResult = await getNeo4jRecord(type, code, idField);

	checkForUniqueRecord({ neo4jResult, idField, code, type });

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

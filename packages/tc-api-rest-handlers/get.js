const httpErrors = require('http-errors');
const { validateInput } = require('./lib/validation');
const { getNeo4jRecord } = require('./lib/read-helpers');

const getHandler = ({ documentStore } = {}) => async input => {
	validateInput(input);

	const { type, code, query: {richRelationships, idField} = {}} = input;

	const neo4jResult = await getNeo4jRecord(type, code, richRelationships, idField);

	if (!neo4jResult.hasRecords()) {
		throw httpErrors(404, `${type} ${code} does not exist`);
	}

	const neo4jResultAsJson = neo4jResult.toJson({ type, richRelationshipsFlag: richRelationships });

	const docstoreResult = documentStore ? documentStore.get(type, neo4jResultAsJson.code) : { body: {} };

	return {
		status: 200,
		body: {...neo4jResultAsJson,
			...docstoreResult.body,
		},
	};
};

module.exports = { getHandler };

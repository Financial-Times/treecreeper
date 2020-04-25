const httpErrors = require('http-errors');
const { validateInput } = require('./lib/validation');
const { getNeo4jNode } = require('./lib/read-helpers');

const headHandler = () => async input => {
	validateInput(input);

	const { type, code, query: { idField = "code"} = {} } = input;

	const neo4jResult = await getNeo4jNode(type, code, idField);

	if (!neo4jResult.hasRecords()) {
		throw httpErrors(404, `${type} with ${idField} "${code}" does not exist`);
	}

	if (idField !== 'code' && neo4jResult.hasMultipleRoots()) {
		throw httpErrors(409, `Multiple ${type} records with ${idField} "${code}" exist`);
	}

	return {
		status: 200,
	};
};

module.exports = { headHandler };

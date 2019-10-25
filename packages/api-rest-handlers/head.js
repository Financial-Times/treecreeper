const httpErrors = require('http-errors');
const { validateInput } = require('./lib/validation');
const { getNeo4jNode } = require('./lib/read-helpers');

const headHandler = () => async input => {
	validateInput(input);

	const { type, code } = input;

	const neo4jResult = await getNeo4jNode(type, code);

	if (!neo4jResult.hasRecords()) {
		throw httpErrors(404, `${type} ${code} does not exist`);
	}

	return {
		status: 200,
	};
};

module.exports = { headHandler };

const { validateInput } = require('./lib/validation');
const { getNeo4jNode, checkForUniqueRecord } = require('./lib/read-helpers');

const headHandler = () => async input => {
	validateInput(input);

	const { type, code, query: { idField = 'code' } = {} } = input;

	const neo4jResult = await getNeo4jNode(type, code, idField);

	checkForUniqueRecord({ neo4jResult, idField, code, type });

	return {
		status: 200,
	};
};

module.exports = { headHandler };

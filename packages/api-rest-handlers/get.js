const httpErrors = require('http-errors');
const { getNeo4jRecord } = require('../api-core');
const { validateInput } = require('../api-core/lib/validation');

const getHandler = ({
	documentStore = { get: () => null },
} = {}) => async input => {
	const { type, code } = validateInput(input);

	const [neo4jResult, documentStoreResult] = await Promise.all([
		getNeo4jRecord(type, code),
		documentStore.get(type, code),
	]);

	if (!neo4jResult.hasRecords()) {
		throw httpErrors(404, `${type} ${code} does not exist`);
	}

	return {
		status: 200,
		body: Object.assign(neo4jResult.toJson(type), documentStoreResult),
	};
};

module.exports = { getHandler };

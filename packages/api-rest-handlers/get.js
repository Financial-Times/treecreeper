const httpErrors = require('http-errors');
const { validateInput } = require('./lib/validation');
const { getNeo4jRecord } = require('./lib/read-helpers');

const getHandler = ({ documentStore } = {}) => async input => {
	validateInput(input);

	const { type, code } = input;
	const tasks = [getNeo4jRecord(type, code)];

	if (documentStore) {
		tasks.push(documentStore.get(type, code));
	}

	const [neo4jResult, documentStoreResult] = await Promise.all(tasks);

	if (!neo4jResult.hasRecords()) {
		throw httpErrors(404, `${type} ${code} does not exist`);
	}

	const { body: documentStoreBody = {} } = documentStoreResult || {};

	return {
		status: 200,
		body: Object.assign(neo4jResult.toJson(type), documentStoreBody),
	};
};

module.exports = { getHandler };

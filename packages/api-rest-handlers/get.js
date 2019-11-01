const httpErrors = require('http-errors');
const { validateInput } = require('./lib/validation');
const { getNeo4jRecord } = require('./lib/read-helpers');

const getHandler = ({ documentStore } = {}) => async input => {
	validateInput(input);

	const { type, code, query } = input;
	const richRelationshipsInfoFlag = query && query.richRelationships;

	const [neo4jResult, docstoreResult] = await Promise.all([
		getNeo4jRecord(type, code, richRelationshipsInfoFlag),
		documentStore ? documentStore.get(type, code) : { body: {} },
	]);

	if (!neo4jResult.hasRecords()) {
		throw httpErrors(404, `${type} ${code} does not exist`);
	}

	const { body: docstoreBody = {} } = docstoreResult || {};

	return {
		status: 200,
		body: Object.assign(neo4jResult.toJson(type), docstoreBody),
	};
};

module.exports = { getHandler };

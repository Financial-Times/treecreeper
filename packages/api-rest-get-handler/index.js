const httpErrors = require('http-errors');
const { getNodeWithRelationships } = require('../api-core');
const { validateInput } = require('../api-core/lib/validation');

const getHandler = ({
	logger,
	requestContext,
	documentStore, // s3 adaptor object
	lockFieldsUsingMetadata, // string
	updateStream, // kinesis
} = {}) => {
	return async input => {
		;

		const { type, code } = validateInput(input);

		const [neo4jResult, documentStoreResult] = await Promise.all([
			getNodeWithRelationships(type, code),
			documentStore ? documentStore.get(type, code) : null,
		]);

		const parsedNeo4jResult = neo4jResult.toJson(type);

		if (!parsedNeo4jResult) {
			throw httpErrors(404, `${type} ${code} does not exist`);
		}
		return {
			status: 200,
			body: Object.assign(parsedNeo4jResult, documentStoreResult),
		};
	};
};

module.exports = { getHandler };

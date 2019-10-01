const { getNodeWithRelationships } = require('../api-core');

const getHandler = ({
    logger,
    requestContext,
    documentStore, // s3 adaptor object
    lockFieldsUsingMetadata, // string
    updateStream // kinesis
} = {}) => {
	return async ({
	    metaData,
	    body,
	    type,
	    code
	}) => {
		const [neo4jResult, documentStoreResult] = await Promise.all([
			getNodeWithRelationships(type, code),
			documentStore ? documentStore.get(type, code) : null
		]);
		// need to reimplement 404
		//preflightChecks.bailOnMissingNode({ result, nodeType, code, status: 404 });
		return {status: 200, body: Object.assign(neo4jResult.toJson(type), documentStoreResult)};
	}
}

module.exports = {getHandler};

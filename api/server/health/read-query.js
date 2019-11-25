const { logger } = require('../../../packages/tc-api-express-logger');
const { executeQuery } = require('../../../packages/tc-api-db-manager');
const healthcheck = require('./healthcheck');

const runQueryCheck = async () => {
	try {
		const result = await executeQuery(
			`MATCH (node:System)-[relationship:HAS_REPO]->(relatedNode:Repository)
			RETURN node,relatedNode,relationship LIMIT 10`,
		);

		if (result.records.length > 0) {
			return {
				ok: true,
				lastUpdated: new Date().toUTCString(),
				checkOutput: `${result.records.length} records retrieved`,
			};
		}
		return {
			ok: false,
			lastUpdated: new Date().toUTCString(),
			checkOutput: `${result.records.length} records retrieved`,
		};
	} catch (error) {
		logger.error(
			{
				event: 'BIZ_OPS_HEALTHCHECK_FAILURE',
				healthCheckName: 'READ_QUERY',
				error,
			},
			'Healthcheck failed',
		);
		return {
			ok: false,
			lastUpdated: new Date().toUTCString(),
			checkOutput: error.message,
		};
	}
};

module.exports = healthcheck(runQueryCheck, 'readQuery');

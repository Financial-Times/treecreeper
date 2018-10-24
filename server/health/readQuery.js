const { logger } = require('../lib/request-context');
const { stripIndents } = require('common-tags');
const { executeQuery } = require('../data/db-connection');
const healthcheck = require('./healthcheck');
const outputs = require('./output');
const runQueryCheck = async () => {
	try {
		const result = await executeQuery(
			stripIndents`MATCH (node:System)-[relationship:HAS_REPO]->(relatedNode:Repository)
			RETURN node,relatedNode,relationship LIMIT 10`
		);

		if (result.records.length > 0) {
			return {
				lastCheckOk: true,
				lastCheckTime: new Date().toUTCString(),
				lastCheckOutput: 'Result of the cypher query successfully retrieved',
				panicGuide: 'Don\t panic.'
			};
		} else {
			throw `Error retrieving database results: no results found!`;
		}
	} catch (error) {
		logger.error(
			{
				event: 'BIZ_OPS_HEALTHCHECK_FAILURE',
				healthCheckName: 'READ_QUERY',
				error
			},
			'Healthcheck failed'
		);
		return {
			lastCheckOk: false,
			lastCheckTime: new Date().toUTCString(),
			lastCheckOutput: `Bad response when trying to run a cypher query to the biz-ops-api's neo4j instance: ${
				error.message ? error.message : error
			}`,
			panicGuide:
				'Please check the logs in splunk using the following: `source="/var/log/apps/heroku/ft-biz-ops-api.log" event="BIZ_OPS_HEALTHCHECK_FAILURE" healthCheckName="READ_QUERY'
		};
	}
};

module.exports = healthcheck(runQueryCheck, outputs.readQuery);

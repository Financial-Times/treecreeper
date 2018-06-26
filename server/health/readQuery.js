const logger = require('@financial-times/n-logger').default;
const { stripIndents } = require('common-tags');
const { safeQuery } = require('../db-connection');

const FIVE_MINUTES = 5 * 60 * 1000;

let lastCheckOk;
let lastCheckTime;
let lastCheckOutput;
let panicGuide;

const runQueryCheck = async () => {
	const currentDate = new Date().toUTCString();

	try {
		const result = await safeQuery(
			stripIndents`MATCH (node:System)-[relationship:HAS_REPO]->(relatedNode:Repository)
			RETURN node,relatedNode,relationship LIMIT 10`
		);

		if (result) {
			lastCheckOk = true;
			lastCheckTime = currentDate;
			lastCheckOutput = 'Result of the cypher query successfully retrieved';
			panicGuide = "Don't panic";
		} else {
			throw `Error retrieving database results: no results found!`;
		}
	} catch (err) {
		logger.error(
			{
				event: 'BIZ_OPS_HEALTHCHECK_QUERY_FAILURE',
				err
			},
			'Healthcheck failed'
		);
		lastCheckOk = false;
		lastCheckTime = currentDate;
		lastCheckOutput = `Bad response when trying to run a cypher query to the biz-ops-api's neo4j instance: ${
			err.message ? err.message : err
		}`;
		panicGuide =
			'Please check the logs in splunk using the following: `source="/var/log/apps/heroku/ft-biz-ops-api.log" event="BIZ_OPS_HEALTHCHECK_QUERY_FAILURE"';
	}
};

runQueryCheck();
setInterval(async () => {
	await runQueryCheck();
}, FIVE_MINUTES).unref();

module.exports = {
	getStatus: () => {
		return {
			ok: lastCheckOk,
			checkOutput: lastCheckOutput,
			lastUpdated: lastCheckTime,
			businessImpact:
				'Unable to retrieve data from Biz-Ops API. As a result, it will not be possible to read information from Biz-Ops API about our systems, contacts, teams or products',
			severity: '1',
			technicalSummary:
				'Runs a cypher read query to check that a successful response comes back from the Biz-Ops API',
			panicGuide: panicGuide
		};
	}
};

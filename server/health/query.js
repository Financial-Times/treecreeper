const neo4j = require('neo4j-driver').v1;
const logger = require('@financial-times/n-logger');
const { stripIndents } = require('common-tags');
const driver = neo4j.driver(
	process.env.GRAPHENEDB_CHARCOAL_BOLT_URL,
	neo4j.auth.basic(
		process.env.GRAPHENEDB_CHARCOAL_BOLT_USER,
		process.env.GRAPHENEDB_CHARCOAL_BOLT_PASSWORD
	)
);

const FIVE_MINUTES = 5 * 60 * 1000;

let lastCheckOk;
let lastCheckTime;
let lastCheckOutput;
let panicGuide;

const runQueryCheck = async () => {
	const currentDate = new Date().toUTCString();
	const session = driver.session();
	try {
		const result = await session.run(
			stripIndents`MATCH (node:System)-[relationship:HAS_REPO]->(relatedNode:Repository)
			RETURN node,relatedNode,relationship LIMIT 10`
		);
		session.close();
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
		lastCheckOutput = `Bad response when trying to run a cypher query to the database: ${
			err.message ? err.message : err
		}`;
		panicGuide =
			'Please check the logs in splunk using the following: `source="/var/log/apps/heroku/ft-biz-ops-api.log" event="BIZ_OPS_HEALTHCHECK_QUERY_FAILURE"';
	}
};

setInterval(async () => {
	await runQueryCheck();
}, FIVE_MINUTES).unref();

module.exports = {
	getStatus: () => {
		return {
			ok: lastCheckOk,
			checkOutput: lastCheckOutput,
			lastUpdated: lastCheckTime,
			businessImpact: 'Unable to retrieve data from Biz-Ops API',
			severity: '1',
			technicalSummary:
				'Runs a cypher query to check that a successful response comes back',
			panicGuide: panicGuide
		};
	}
};

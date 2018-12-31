const neo4j = require('neo4j-driver').v1;
const { logger } = require('../lib/request-context');
const metrics = require('next-metrics');
const { TIMEOUT } = require('../constants');
const driver = neo4j.driver(
	process.env.GRAPHENEDB_CHARCOAL_BOLT_URL,
	neo4j.auth.basic(
		process.env.GRAPHENEDB_CHARCOAL_BOLT_USER,
		process.env.GRAPHENEDB_CHARCOAL_BOLT_PASSWORD
	)
);

const originalSession = driver.session;

driver.session = (...args) => {
	const session = originalSession.apply(driver, args);
	const originalRun = session.run;

	session.run = async (...args) => {
		const start = Date.now();
		metrics.count('neo4j.query.count');
		let isSuccessful = false;
		try {
			const result = await Promise.race([
				originalRun.apply(session, args),
				new Promise((res, rej) => {
					setTimeout(
						() =>
							// note that this will cause the finally block to run, which closes the session
							rej(
								new Error(
									'Neo4j query took more than 15 seconds: closing session'
								)
							),
						TIMEOUT
					);
				})
			]);

			isSuccessful = true;
			return result;
		} finally {
			session.close();
			const totalTime = Date.now() - start;
			const metricPrefix = `neo4j.query.${
				isSuccessful ? 'success' : 'failure'
			}`;
			metrics.histogram(`${metricPrefix}.time`, totalTime);
			metrics.count(`${metricPrefix}.count`);
			logger.info({
				event: 'NEO4J_QUERY',
				successful: isSuccessful,
				totalTime
			});
		}
	};
	return session;
};

module.exports = {
	driver,
	executeQuery: async (...args) => driver.session().run(...args),
	executeQueryWithSharedSession: (session = driver.session()) => {
		const executeQuery = async (...args) => {
			const result = await session.run(...args);
			return result;
		};
		executeQuery.close = () => session.close();

		return executeQuery;
	}
};

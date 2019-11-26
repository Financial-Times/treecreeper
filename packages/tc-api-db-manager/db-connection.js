const neo4j = require('neo4j-driver').v1;
const metrics = require('next-metrics');
const { logger } = require('@financial-times/tc-api-express-logger');

let TIMEOUT;

const timeoutErrorMessage = timeout =>
	`Neo4j query took more than ${timeout} milliseconds: closing session`;

const driver = neo4j.driver(
	process.env.NEO4J_BOLT_URL,
	neo4j.auth.basic(
		process.env.NEO4J_BOLT_USER,
		process.env.NEO4J_BOLT_PASSWORD,
	),
	{ disableLosslessIntegers: true },
);

const originalSession = driver.session;

const getTimeoutRacePromise = timeout =>
	new Promise((res, rej) => {
		setTimeout(
			() =>
				// note that this will cause the finally block to run, which closes the session
				rej(new Error(timeoutErrorMessage(timeout))),
			TIMEOUT,
		);
	});

driver.session = (...sessionArgs) => {
	const session = originalSession.apply(driver, sessionArgs);
	const originalRun = session.run;

	session.run = async (...runArgs) => {
		const start = Date.now();
		metrics.count('neo4j.query.count');
		let isSuccessful = false;
		try {
			const dbCall = originalRun.apply(session, runArgs);
			const result = TIMEOUT
				? await Promise.race([dbCall, getTimeoutRacePromise(TIMEOUT)])
				: dbCall;

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
				totalTime,
			});
		}
	};
	return session;
};

module.exports = {
	driver,
	setDbQueryTimeout: timeout => {
		TIMEOUT = timeout;
	},
	executeQuery: (query, parameters) =>
		driver.session().run(query, parameters),
	executeQueryWithSharedSession: (session = driver.session()) => {
		const executeQuery = async (...args) => {
			const result = await session.run(...args);
			return result;
		};
		executeQuery.close = () => session.close();

		return executeQuery;
	},
};

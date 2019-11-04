const neo4j = require('neo4j-driver').v1;
const metrics = require('next-metrics');
const { logger: defaultLogger } = require('../api-express/lib/request-context');

const { TIMEOUT } = { TIMEOUT: 15000 };

const driver = neo4j.driver(
	process.env.NEO4J_BOLT_URL,
	neo4j.auth.basic(
		process.env.NEO4J_BOLT_USER,
		process.env.NEO4J_BOLT_PASSWORD,
	),
	{ disableLosslessIntegers: true },
);

const originalSession = driver.session;

const queryTimedout = timeout =>
	new Promise((resolve, reject) => {
		setTimeout(
			() =>
				reject(
					// note that this will cause the finally block to run, which closes the session
					new Error(
						`Neo4j query took more than ${timeout /
							1000} seconds: closing session`,
					),
				),
			timeout,
		);
	});

const createDriverSession = ({ logger = defaultLogger } = {}) => (
	...sessionArgs
) => {
	const session = originalSession.apply(driver, sessionArgs);
	const originalRun = session.run;

	session.run = async (...runArgs) => {
		const start = Date.now();
		metrics.count('neo4j.query.count');
		let isSuccessful = false;
		try {
			const result = await Promise.race([
				originalRun.apply(session, runArgs),
				queryTimedout(TIMEOUT),
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
				totalTime,
			});
		}
	};
	return session;
};

driver.session = createDriverSession();

const composeDbConnection = (composeOptions = {}) => {
	const { logger } = composeOptions;
	// Overwrite driver.session with using provided logger
	driver.session = createDriverSession({ logger });
	return composeOptions;
};

module.exports = {
	driver,
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
	composeDbConnection,
};

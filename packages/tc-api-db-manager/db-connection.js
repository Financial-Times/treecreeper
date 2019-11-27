const neo4j = require('neo4j-driver').v1;
const metrics = require('next-metrics');
const { logger } = require('@financial-times/tc-api-express-logger');

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

const runQueryWithMetrics = async ({
	session,
	runner,
	isTransaction = false,
}) => {
	const start = Date.now();
	metrics.count('neo4j.query.count');
	let isSuccessful = false;
	try {
		const result = await Promise.race([
			runner(),
			new Promise((res, rej) => {
				setTimeout(
					() =>
						// note that this will cause the finally block to run, which closes the session
						rej(
							new Error(
								'Neo4j query took more than 15 seconds: closing session',
							),
						),
					TIMEOUT,
				);
			}),
		]);

		isSuccessful = true;
		return result;
	} finally {
		if (!isTransaction) {
			session.close();
		}
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

driver.session = (...sessionArgs) => {
	const session = originalSession.apply(driver, sessionArgs);
	const originalRun = session.run;

	session.run = async (...runArgs) =>
		runQueryWithMetrics({
			session,
			runner: () => originalRun.apply(session, runArgs),
		});

	return session;
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
	executeQueryWithTransaction: async (...queries) => {
		const session = originalSession.apply(driver, []);
		const result = await session.writeTransaction(async tx =>
			Promise.all(
				queries.map(({ query, parameters }) =>
					runQueryWithMetrics({
						session,
						runner: () => tx.run(query, parameters),
						isTransaction: true,
					}),
				),
			),
		);
		session.close();
		return result;
	},
};

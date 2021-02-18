const assert = require('assert');
const neo4j = require('neo4j-driver');
const metrics = require('next-metrics');
const { logger } = require('@financial-times/tc-api-express-logger');

let TIMEOUT;

// NOTE: This check ensures apps fail on startup instead of getting cryptic
// error messages later.
const validateEnvironment = () => {
	assert.ok(process.env.NEO4J_BOLT_URL, 'Neo4J URL not set');
	assert.match(
		process.env.NEO4J_BOLT_URL,
		/^neo4j\+ssc:/,
		'Neo4J URL not valid',
	);
	assert.ok(process.env.NEO4J_BOLT_USER, 'Neo4J username not set');
	assert.ok(process.env.NEO4J_BOLT_PASSWORD, 'Neo4J password not set');
};

validateEnvironment();

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

const runQueryWithMetrics = async runner => {
	const start = Date.now();
	metrics.count('neo4j.query.count');
	let isSuccessful = false;
	try {
		const result = TIMEOUT
			? await Promise.race([runner(), getTimeoutRacePromise(TIMEOUT)])
			: await runner();

		isSuccessful = true;
		return result;
	} finally {
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
		runQueryWithMetrics(() => originalRun.apply(session, runArgs));

	return session;
};

module.exports = {
	driver,
	setTimeout: timeout => {
		TIMEOUT = timeout;
	},
	executeQuery: async (query, parameters) => {
		const session = driver.session();
		try {
			return await session.run(query, parameters);
		} finally {
			session.close();
		}
	},
	executeQueryWithSharedSession: (session = driver.session()) => {
		const executeQuery = async (...args) => session.run(...args);
		executeQuery.close = () => session.close();

		return executeQuery;
	},
	executeQueriesWithTransaction: async (...queries) => {
		const session = originalSession.apply(driver, []);
		const result = await session.writeTransaction(async tx =>
			Promise.all(
				queries.map(({ query, parameters }) =>
					runQueryWithMetrics(() => tx.run(query, parameters)),
				),
			),
		);
		session.close();
		return result;
	},
};

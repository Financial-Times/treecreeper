const neo4j = require('neo4j-driver').v1;
const { logger } = require('../lib/request-context');
const metrics = require('next-metrics');

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
			const result = await originalRun.apply(session, args);
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
				totalTime
			});
		}
	};
	return session;
};

module.exports = {
	driver,
	executeQuery: async (...args) => {
		const session = driver.session();
		try {
			return await session.run(...args);
		} finally {
			session.close();
		}
	},
	executeQueryWithSharedSession: (session = driver.session()) => {
		const executeQuery = async (...args) => {
			const result = await session.run(...args);
			return result;
		};
		executeQuery.close = () => session.close();

		return executeQuery;
	},
	writeTransaction: async steps => {
		const session = driver.session();
		const transactionFunction = async transaction => {
			let step;
			let results = [];
			while ((step = steps.shift())) {
				if (Array.isArray(step)) {
					results = results.concat(
						await Promise.all(
							step.map(({ query, params }) =>
								transaction.run(query, params || {})
							)
						)
					);
				} else {
					results.push(await transaction.run(step.query, step.params || {}));
				}
			}
			return results;
		};
		try {
			return await session.writeTransaction(transactionFunction);
		} finally {
			session.close();
		}
	}
};

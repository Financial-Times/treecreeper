const neo4j = require('neo4j-driver').v1;
const { logger } = require('./request-context');

const driver = neo4j.driver(
	process.env.GRAPHENEDB_CHARCOAL_BOLT_URL,
	neo4j.auth.basic(
		process.env.GRAPHENEDB_CHARCOAL_BOLT_USER,
		process.env.GRAPHENEDB_CHARCOAL_BOLT_PASSWORD
	)
);

module.exports = {
	driver,
	executeQuery: async (...args) => {
		const session = driver.session();
		const start = Date.now();
		try {
			return await session.run(...args);
		} finally {
			logger.info({
				event: 'NEO4J_QUERY',
				sessiontype: 'singleuse',
				totalTime: Date.now() - start
			});
			session.close();
		}
	},
	executeQueryWithSharedSession: (session = driver.session()) => {
		const executeQuery = async (...args) => {
			const start = Date.now();
			const result = await session.run(...args);
			logger.info({
				event: 'NEO4J_QUERY',
				sessiontype: 'reused',
				totalTime: Date.now() - start
			});
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
		const start = Date.now();
		try {
			return await session.writeTransaction(transactionFunction);
		} finally {
			logger.info({
				event: 'NEO4J_QUERY',
				sessiontype: 'writetransaction',
				totalTime: Date.now() - start
			});
			session.close();
		}
	}
};

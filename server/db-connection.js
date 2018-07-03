const neo4j = require('neo4j-driver').v1;
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
		try {
			return await session.run(...args);
		} finally {
			session.close();
		}
	},
	executeQueryWithSharedSession: (session = driver.session()) => {
		const executeQuery = async (...args) => {
			return await session.run(...args);
		};
		executeQuery.close = () => session.close();
		return executeQuery;
	}
};

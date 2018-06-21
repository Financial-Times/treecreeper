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
	safeQuery: async (...args) => {
		const session = driver.session();
		try {
			return await session.run(...args);
		} finally {
			session.close();
		}
	},
	safeQueryWithSharedSession: (session = driver.session()) => {
		const safeQuery = async (...args) => {
			return await session.run(...args);
		};
		safeQuery.close = () => session.close();
		return safeQuery;
	}
};

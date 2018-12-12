const security = require('../middleware/security');
const { graphiqlExpress } = require('apollo-server-express');
const DEFAULT_QUERY = require('./default-query');

module.exports = router => {
	router.use(
		'/graphiql',
		security.requireS3o,
		graphiqlExpress({
			endpointURL: '/graphql',
			query: DEFAULT_QUERY
		})
	);
	return router;
};

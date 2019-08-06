const { graphiqlExpress } = require('apollo-server-express');
const security = require('../../middleware/security');
const { DEFAULT_QUERY } = require('./lib/default-graphiql-query');

module.exports = router => {
	router.use(
		'/',
		security.requireS3o,
		graphiqlExpress({
			endpointURL: '/graphql',
			query: DEFAULT_QUERY,
		}),
	);
	return router;
};

const security = require('../middleware/security');
const { graphiqlExpress } = require('apollo-server-express');
const DEFAULT_QUERY = require('../data/default-query');

module.exports = router => {
	router.use(
		'/',
		security.requireS3o,
		graphiqlExpress({
			endpointURL: '/graphql',
			query: DEFAULT_QUERY
		})
	);
	return router;
};

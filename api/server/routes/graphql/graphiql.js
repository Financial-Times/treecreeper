const expressPlayground = require('graphql-playground-middleware-express')
	.default;
const security = require('../../middleware/security');
const { DEFAULT_QUERY } = require('./lib/default-graphiql-query');

module.exports = router => {
	router.use(
		'/',
		// security.requireS3o,
		expressPlayground({
			endpoint: '/graphql',
			settings: {
				'request.credentials': 'same-origin',
			},
			// tabs: {
			// 	endpoint: '/graphiql/example',
			// 	query: DEFAULT_QUERY,
			// 	name: 'Example',
			// },
		}),
	);
	return router;
};

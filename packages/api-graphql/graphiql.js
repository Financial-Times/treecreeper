const expressPlayground = require('graphql-playground-middleware-express')
	.default;
const security = require('../../middleware/security');

module.exports = router => {
	router.use(
		'/',
		security.requireS3o,
		expressPlayground({
			endpoint: '/graphql',
			settings: {
				'request.credentials': 'same-origin',
			},
		}),
	);
	return router;
};

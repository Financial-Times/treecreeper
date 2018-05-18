const security = require('../middleware/security');
const graphQl = require('../controllers/graphQl');

module.exports = router => {
	router.get('/__gtg', (req, res) => {
		res.status(200).end();
	});

	router.get('/', (req, res) => {
		res.send('biz op api');
	});

	router.use(
		'/graphiql',
		security.requireS3o,
		graphQl.graphiql('/api/graphql')
	);

	return router;
};

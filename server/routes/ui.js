const security = require('../middleware/security');
const graphql = require('../graphql/controllers');

module.exports = router => {
	router.get('/__gtg', (req, res) => {
		res.status(200).end();
	});

	router.use('/graphiql', security.requireS3o, graphql.graphiql('/graphql'));

	return router;
};

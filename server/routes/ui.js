'use strict';

const s3o = require('@financial-times/s3o-middleware');
const graphQl = require('../controllers/graphQl');

module.exports = router => {
	router.get('/__gtg', (req, res) => {
		res.status(200).end();
	});

	router.get('/', (req, res) => {
		res.send('biz op api');
	});

	router.use(s3o);

	router.get('/graphiql', graphQl.graphiql('/api/graphql'));

	return router;
};

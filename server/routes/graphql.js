const bodyParser = require('body-parser');
const timeout = require('connect-timeout');
const security = require('../middleware/security');
const graphql = require('../graphql/controllers');
const logger = require('@financial-times/n-logger').default;

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true })
];

module.exports = router => {
	router.use(timeout('65s'));
	router.use(security.requireApiAuthOrS3o);
	router.use(bodyParsers);
	router.use((req, res, next) => {
		logger.info({
			event: 'GRAPHQL_REQUEST',
			clientId: req.get('client-id'),
			requestId: req.get('x-request-id'),
			body: req.body
		});
		next();
	});
	router.post('/', graphql.api);

	return router;
};

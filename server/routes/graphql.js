const bodyParser = require('body-parser');
const timeout = require('connect-timeout');
const security = require('../middleware/security');
const maintenance = require('../middleware/maintenance');
const graphql = require('../graphql/controllers');
const { logger, setContext } = require('../lib/request-context');
const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true })
];

module.exports = router => {
	setContext('endpoint', 'graphql');
	router.use(timeout('65s'));
	router.use(security.requireApiAuthOrS3o);
	router.use(maintenance.disableReads);
	router.use(bodyParsers);

	router.use((req, res, next) => {
		setContext({ endpoint: 'graphql', method: req.method });
		logger.info({
			event: 'GRAPHQL_REQUEST',
			body: req.body
		});
		next();
	});
	router.post('/', graphql.api);
	return router;
};

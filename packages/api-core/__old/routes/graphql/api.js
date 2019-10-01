const bodyParser = require('body-parser');
const timeout = require('connect-timeout');
const { logger, setContext } = require('../../lib/request-context');
const security = require('../../middleware/security');
const maintenance = require('../../middleware/maintenance');
const clientId = require('../../middleware/client-id');
const { TIMEOUT } = require('../../constants');

const { onChange } = require('../../../../packages/schema-sdk');
const { sendSchemaToS3 } = require('../../../../packages/schema-publisher');

let schemaVersionIsConsistent = true;
let graphqlAPI;

const { getApolloMiddleware } = require('./lib/get-apollo-middleware');

const updateAPI = () => {
	try {
		graphqlAPI = getApolloMiddleware();

		schemaVersionIsConsistent = true;
		logger.info({ event: 'GRAPHQL_SCHEMA_UPDATED' });

		if (process.env.NODE_ENV === 'production') {
			sendSchemaToS3('api')
				.then(() => {
					logger.info({ event: 'GRAPHQL_SCHEMA_SENT_TO_S3' });
				})
				.catch(error => {
					logger.error({
						event: 'SENDING_SCHEMA_TO_S3_FAILED',
						error,
					});
				});
		}
	} catch (error) {
		schemaVersionIsConsistent = false;
		logger.error(
			{ event: 'GRAPHQL_SCHEMA_UPDATE_FAILED', error },
			'Graphql schema update failed',
		);
	}
};

onChange(updateAPI);

module.exports = router => {
	router.use(timeout(TIMEOUT));
	router.use((req, res, next) => {
		if (req.get('client-id')) {
			return clientId(req, res, next);
		}
		next();
	});
	router.use(security.requireApiKeyOrS3o);
	router.use(maintenance.disableReads);
	router.use([
		bodyParser.json({ limit: '8mb' }),
		bodyParser.urlencoded({ limit: '8mb', extended: true }),
	]);
	router.use((req, res, next) => {
		res.nextMetricsName = 'graphql';
		setContext({ endpoint: 'graphql', method: req.method });
		logger.info({
			event: 'GRAPHQL_REQUEST',
			body: req.body,
		});
		next();
	});

	// Note that we wrap the api controller in a function that passes
	// the original args through because a new api controller is generated
	// every time the schema changes. We can't pass express a direct
	// reference to the api controller on startup, or it will
	// never update the reference to point at the latest version of the
	// controller using the latest schema
	router
		.route('/')
		.get((...args) => graphqlAPI(...args))
		.post((...args) => graphqlAPI(...args));

	return router;
};

module.exports.checkSchemaConsistency = () => schemaVersionIsConsistent;

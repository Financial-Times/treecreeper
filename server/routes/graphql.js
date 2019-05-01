const bodyParser = require('body-parser');
const timeout = require('connect-timeout');
const { formatError } = require('graphql');
const { graphqlExpress } = require('apollo-server-express');
const schema = require('@financial-times/biz-ops-schema');
const { logger, setContext } = require('../lib/request-context');
const security = require('../middleware/security');
const maintenance = require('../middleware/maintenance');
const clientId = require('../middleware/client-id');
const { TIMEOUT } = require('../constants');
const { createSchema } = require('../data/graphql-schema');
const { driver } = require('../data/db-connection');

let api;
let schemaVersionIsConsistent = true;

const constructAPI = () => {
	try {
		const newSchema = createSchema();
		api = graphqlExpress(({ headers }) => ({
			schema: newSchema,
			rootValue: {},
			context: {
				driver,
				headers,
			},
			formatError(error) {
				const isS3oError = /Forbidden/i.test(error.message);
				logger.error('GraphQL Error', {
					event: 'GRAPHQL_ERROR',
					error,
				});
				const displayedError = isS3oError
					? new Error(
							'FT s3o session has expired. Please reauthenticate via s3o - i.e. refresh the page if using the graphiql explorer',
					  )
					: error;
				return formatError(displayedError);
			},
		}));
		schemaVersionIsConsistent = true;
		logger.info({ event: 'GRAPHQL_SCHEMA_UPDATED' });

		if (process.env.NODE_ENV === 'production') {
			schema
				.sendSchemaToS3('api')
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

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true }),
];

schema.on('change', constructAPI);

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
	router.use(bodyParsers);

	router.use((req, res, next) => {
		res.nextMetricsName = 'graphql';
		setContext({ endpoint: 'graphql', method: req.method });
		logger.info({
			event: 'GRAPHQL_REQUEST',
			body: req.body,
		});
		next();
	});

	router
		.route('/')
		.get((...args) => api(...args))
		.post((...args) => api(...args));

	return router;
};

module.exports.checkSchemaConsistency = () => schemaVersionIsConsistent;

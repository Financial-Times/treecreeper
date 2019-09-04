const bodyParser = require('body-parser');
const timeout = require('connect-timeout');
const { formatError } = require('graphql');
const { graphqlExpress } = require('apollo-server-express');
const schema = require('@financial-times/biz-ops-schema');
const DataLoader = require('dataloader');
const { logger, setContext } = require('../../lib/request-context');
const security = require('../../middleware/security');
const maintenance = require('../../middleware/maintenance');
const clientId = require('../../middleware/client-id');
const { TIMEOUT } = require('../../constants');
const { createSchema } = require('./lib/graphql-schema');
const { driver } = require('../../lib/db-connection');
const S3DocumentsHelper = require('../rest/lib/s3-documents-helper');

const s3 = new S3DocumentsHelper();

let api;
let schemaVersionIsConsistent = true;

const constructAPI = () => {
	try {
		const newSchema = createSchema();
		api = graphqlExpress(({ headers }) => {
			const s3DocsDataLoader = new DataLoader(async keys => {
				const [type, code] = keys[0].split('/');
				const record = await s3.getFileFromS3(type, code);
				return [record];
			});

			return {
				schema: newSchema,
				rootValue: {},
				context: {
					driver,
					headers,
					s3DocsDataLoader,
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
			};
		});
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

	// Note that we wrap the api controller in a function that passes
	// the original args through because a new api controller is generated
	// every time the schema changes. We can't pass express a direct
	// reference to the api controller on startup, or it will
	// never update the reference to point at the latest version of the
	// controller using the latest schema
	router
		.route('/')
		.get((...args) => api(...args))
		.post((...args) => api(...args));

	return router;
};

module.exports.checkSchemaConsistency = () => schemaVersionIsConsistent;

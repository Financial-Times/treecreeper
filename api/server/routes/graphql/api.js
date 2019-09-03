const bodyParser = require('body-parser');
const timeout = require('connect-timeout');
const { formatError } = require('graphql');
const { ApolloServer } = require('apollo-server-express');
const graphql = require('graphql');
const { logger, setContext } = require('../../lib/request-context');
const security = require('../../middleware/security');
const maintenance = require('../../middleware/maintenance');
const clientId = require('../../middleware/client-id');
const { TIMEOUT } = require('../../constants');
const {
	schemaEmitter,
	getAugmentedSchema,
} = require('./lib/get-augmented-schema');
const { driver } = require('../../lib/db-connection');

const apollo = new ApolloServer({
	subscriptions: false,
	gateway: {
		load: () => {
			const schema = getAugmentedSchema();
			return Promise.resolve({
				schema,
				executor: args => {
					return graphql.execute({
						...args,
						schema,
						contextValue: {
							driver,
							// headers: req.headers,
						},
					});
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
			});
		},
		onSchemaChange: callback => {
			schemaEmitter.on('schemaUpdate', callback);
			return () => schemaEmitter.off('schemaUpdate', callback);
		},
	},
});

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
	apollo.applyMiddleware({ app: router, path: '/' });

	return router;
};

module.exports.checkSchemaConsistency = () => true;

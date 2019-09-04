const bodyParser = require('body-parser');
const timeout = require('connect-timeout');
const { formatError } = require('graphql');
const { ApolloServer } = require('apollo-server-express');
const graphql = require('graphql');
const DataLoader = require('dataloader');
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
const { getType } = require('../../../../packages/schema-sdk');
const S3DocumentsHelper = require('../rest/lib/s3-documents-helper');

const s3 = new S3DocumentsHelper();

class Tracer {
	constructor() {
		this.map = {};
	}

	collect(type, field) {
		this.map[type] = this.map[type] || new Set();
		this.map[type].set(field);
	}

	log() {
		Object.entries(this.map).map(([type, fields]) => {
			const { properties } = getType(type);
			fields = [...fields];
			logger.info({
				event: 'GRAPHQL_TRACE',
				type,
				fields,
				deprecatedFields: fields.filter(
					name => !!properties[name].deprecationReason,
				),
			});
		});
	}
}

const apollo = new ApolloServer({
	subscriptions: false,
	gateway: {
		load: () => {
			const schema = getAugmentedSchema();
			return Promise.resolve({
				schema,
				executor: args => {
					const s3DocsDataLoader = new DataLoader(async keys => {
						const [type, code] = keys[0].split('/');
						const record = await s3.getFileFromS3(type, code);
						return [record];
					});
					const trace = new Tracer();
					const result = graphql.execute({
						...args,
						schema,
						contextValue: {
							driver,
							s3DocsDataLoader,
							trace,
							// headers: req.headers,
						},
					});

					trace.log();
					return result;
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

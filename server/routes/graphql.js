const bodyParser = require('body-parser');
const timeout = require('connect-timeout');
const security = require('../middleware/security');
const maintenance = require('../middleware/maintenance');
const clientId = require('../middleware/client-id');

const { formatError } = require('graphql');
const { graphqlExpress } = require('apollo-server-express');
const schema = require('../data/graphql-schema');
const { driver } = require('../data/db-connection');

const { logger, setContext } = require('../lib/request-context');
const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true })
];

const api = graphqlExpress(({ headers }) => ({
	schema,
	rootValue: {},
	context: {
		driver,
		headers
	},
	formatError(error) {
		const isS3oError = /Forbidden/i.test(error.message);
		logger.error('GraphQL Error', { event: 'GRAPHQL_ERROR', error });
		const displayedError = isS3oError
			? new Error(
					'FT s3o session has expired. Please reauthenticate via s3o - i.e. refresh the page if using the graphiql explorer'
			  )
			: error;
		return formatError(displayedError);
	}
}));

module.exports = router => {
	router.use(timeout('65s'));
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
			body: req.body
		});
		next();
	});
	router.post('/', api);
	return router;
};

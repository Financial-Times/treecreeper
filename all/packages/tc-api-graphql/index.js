const { logger } = require('@financial-times/tc-api-express-logger');
const { onChange } = require('@financial-times/tc-schema-sdk');
const { sendSchemaToS3 } = require('@financial-times/tc-schema-publisher');
const { getApolloMiddleware } = require('./lib/get-apollo-middleware');

const getGraphqlApi = ({
	documentStore,
	republishSchema,
	republishSchemaPrefix = 'api',
	typeDefs = [],
	resolvers = {},
	excludeTypes,
} = {}) => {
	let schemaDidUpdate;
	let graphqlHandler;
	let lastError;

	const updateAPI = () => {
		try {
			graphqlHandler = getApolloMiddleware({
				documentStore,
				typeDefs,
				resolvers,
				excludeTypes,
			});

			lastError = null;
			schemaDidUpdate = true;
			logger.info({ event: 'GRAPHQL_SCHEMA_UPDATED' });

			if (republishSchema && !process.env.TREECREEPER_TEST) {
				sendSchemaToS3(republishSchemaPrefix)
					.then(() => {
						logger.info({ event: 'GRAPHQL_SCHEMA_SENT_TO_S3' });
					})
					.catch(error => {
						logger.error(
							{
								event: 'SENDING_SCHEMA_TO_S3_FAILED',
							},
							error,
						);
					});
			}
		} catch (error) {
			schemaDidUpdate = false;
			lastError = error;

			logger.error(
				'Graphql schema update failed',
				{ event: 'GRAPHQL_SCHEMA_UPDATE_FAILED' },
				error,
			);
		}
	};

	return {
		graphqlHandler: (...args) => {
			if (typeof graphqlHandler === 'function') {
				return graphqlHandler(...args);
			}
			const detail = lastError ? `:\n\n${lastError}` : '';
			throw new Error(`Apollo middleware failed to initialise ${detail}`);
		},
		isSchemaUpdating: () => schemaDidUpdate,
		listenForSchemaChanges: () => onChange(updateAPI),
	};
};

module.exports = {
	getGraphqlApi,
};

const { logger } = require('@financial-times/tc-api-express-logger');
const { onChange } = require('@financial-times/tc-schema-sdk');
const { sendSchemaToS3 } = require('@financial-times/tc-schema-publisher');
const { getApolloMiddleware } = require('./lib/get-apollo-middleware');
let instanceId = 0;
const getGraphqlApi = ({
	documentStore,
	republishSchema,
	republishSchemaPrefix = 'api',
	typeDefs = [],
	resolvers = {},
	excludeTypes,
	schemaInstance,
} = {}) => {
	let schemaDidUpdate;
	let graphqlHandler;
	const instance = instanceId++;

	const updateAPI = () => {

		try {
			graphqlHandler = getApolloMiddleware({
				documentStore,
				typeDefs,
				resolvers,
				excludeTypes,
				schemaInstance,
			});


			console.log({instance, graphqlHandler})

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
			logger.error(
				'Graphql schema update failed',
				{ event: 'GRAPHQL_SCHEMA_UPDATE_FAILED' },
				error,
			);
		}
	};

	return {
		graphqlHandler: (...args) => {
			console.log({instance, graphqlHandler})
			return graphqlHandler(...args)
		},
		isSchemaUpdating: () => schemaDidUpdate,
		listenForSchemaChanges: () => onChange(updateAPI),
	};
};

module.exports = {
	getGraphqlApi,
};

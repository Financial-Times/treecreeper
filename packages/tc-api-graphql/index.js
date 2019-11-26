const { logger } = require('@financial-times/tc-api-express-logger');
const { onChange } = require('@financial-times/tc-schema-sdk');
const { sendSchemaToS3 } = require('@financial-times/tc-schema-publisher');
const { getApolloMiddleware } = require('./lib/get-apollo-middleware');

const getGraphqlApi = ({
	documentStore,
	republishSchema,
	republishSchemaPrefix = 'api',
} = {}) => {
	let schemaDidUpdate;
	let graphqlHandler;

	const updateAPI = () => {
		try {
			graphqlHandler = getApolloMiddleware({ documentStore });

			schemaDidUpdate = true;
			logger.info({ event: 'GRAPHQL_SCHEMA_UPDATED' });

			if (republishSchema) {
				sendSchemaToS3(republishSchemaPrefix)
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
			schemaDidUpdate = false;
			logger.error(
				{ event: 'GRAPHQL_SCHEMA_UPDATE_FAILED', error },
				'Graphql schema update failed',
			);
			console.log(error);
		}
	};

	return {
		graphqlHandler: (...args) => graphqlHandler(...args),
		isSchemaUpdating: () => schemaDidUpdate,
		listenForSchemaChanges: () => onChange(updateAPI),
	};
};

module.exports = {
	getGraphqlApi,
};

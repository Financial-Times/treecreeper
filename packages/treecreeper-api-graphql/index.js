const { logger } = require('@financial-times/treecreeper-api-express-logger');
const { onChange } = require('@financial-times/treecreeper-schema-sdk');
const {
	sendSchemaToS3,
} = require('@financial-times/treecreeper-schema-publisher');
const { getApolloMiddleware } = require('./lib/get-apollo-middleware');

const getGraphqlApi = ({ documentStore, republishSchema } = {}) => {
	let schemaDidUpdate = false;
	let graphqlHandler;

	const updateAPI = () => {
		try {
			graphqlHandler = getApolloMiddleware({ documentStore });

			schemaDidUpdate = true;
			logger.info({ event: 'GRAPHQL_SCHEMA_UPDATED' });

			if (republishSchema) {
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
			schemaDidUpdate = false;
			logger.error(
				{ event: 'GRAPHQL_SCHEMA_UPDATE_FAILED', error },
				'Graphql schema update failed',
			);
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

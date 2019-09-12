const { ApolloServer } = require('apollo-server-express');
const DataLoader = require('dataloader');
const { formatError } = require('graphql');
const { getAugmentedSchema } = require('./get-augmented-schema');
const { logger } = require('../../../lib/request-context');
const { driver } = require('../../../lib/db-connection');
const S3DocumentsHelper = require('../../rest/lib/s3-documents-helper');

const s3 = new S3DocumentsHelper();

const getApolloMiddleware = () => {
	const apollo = new ApolloServer({
		subscriptions: false,
		// tracing: true,
		schema: getAugmentedSchema(),
		context: ({ req: { headers } }) => {
			const s3DocsDataLoader = new DataLoader(async keys => {
				const [type, code] = keys[0].split('/');
				const record = await s3.getFileFromS3(type, code);
				return [record];
			});
			return {
				driver,
				s3DocsDataLoader,
				headers,
			};
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

	return apollo.getMiddleware({ path: '/' });
};

module.exports = { getApolloMiddleware };

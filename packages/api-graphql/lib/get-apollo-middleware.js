const { ApolloServer } = require('apollo-server-express');
const DataLoader = require('dataloader');
const { formatError } = require('graphql');
const { getAugmentedSchema } = require('./get-augmented-schema');
const { logger } = require('../../../packages/api-express/lib/request-context');
const { driver } = require('../../../packages/api-db-manager');
const { Tracer } = require('./request-tracer');


const getApolloMiddleware = ({ documentStore }) => {
	const apollo = new ApolloServer({
		subscriptions: false,
		schema: getAugmentedSchema(),
		context: ({ req: { headers } }) => {
			const context = {
				driver,
				headers,
				trace: new Tracer(),
			};

			if (documentStore) {
				context.documentStoreDataLoader = new DataLoader(keys =>
					Promise.all(
						keys.map(key => s3.getFileFromS3(...key.split('/'))),
					),
				);
			}

			return context;
		},
		formatResponse(response, { context }) {
			context.trace.log();
			return response;
		},
		formatError(error, { context }) {
			const isS3oError = /Forbidden/i.test(error.message);
			context.trace.error();
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

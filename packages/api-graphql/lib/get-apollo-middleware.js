const { ApolloServer } = require('apollo-server-express');
const DataLoader = require('dataloader');
const { getAugmentedSchema } = require('./get-augmented-schema');
const { logger } = require('../../../packages/api-express/lib/request-context');
const { driver } = require('../../../packages/api-db-manager');
const { Tracer } = require('./request-tracer');

const getApolloMiddleware = ({ documentStore }) => {
	const apollo = new ApolloServer({
		subscriptions: false,
		schema: getAugmentedSchema({ documentStore }),
		context: ({ req: { headers } }) => {
			const context = {
				driver,
				headers,
				trace: new Tracer(),
			};

			if (documentStore) {
				context.documentStoreDataLoader = new DataLoader(async keys => {
					const responses = await Promise.all(
						keys.map(key => documentStore.get(...key.split('/'))),
					);
					return responses.map(({ body }) => body);
				});
			}

			return context;
		},
		formatResponse: (response, { context }) => {
			context.trace.log();
			return response;
		},
		formatError: error => {
			logger.error('GraphQL Error', {
				event: 'GRAPHQL_ERROR',
				error,
			});
			return error;
		},
	});

	return apollo.getMiddleware({ path: '/' });
};

module.exports = { getApolloMiddleware };

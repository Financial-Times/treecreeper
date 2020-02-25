const { ApolloServer } = require('apollo-server-express');
const DataLoader = require('dataloader');
const {
	logger,
	getContextByRequestId,
} = require('@financial-times/tc-api-express-logger');
const { driver } = require('@financial-times/tc-api-db-manager');
const fetch = require('node-fetch');
const { getAugmentedSchema } = require('./get-augmented-schema');
const { Tracer } = require('./request-tracer');

const getApolloMiddleware = ({ documentStore }) => {
	try {
		getAugmentedSchema({ documentStore });
	} catch (e) {
		console.log(e);
	}
	const apollo = new ApolloServer({
		subscriptions: false,
		schema: getAugmentedSchema({ documentStore }),
		context: ({
			req: { headers },
			res: {
				locals: { requestId },
			},
		}) => {
			const context = {
				driver,
				headers,
				trace: new Tracer(getContextByRequestId(requestId)),
			};

			if (documentStore) {
				context.documentStoreDataLoader = new DataLoader(async keys => {
					const responses = await Promise.all(
						keys.map(key => documentStore.get(...key.split('/'))),
					);
					return responses.map(({ body }) => body);
				});
			}

			context.sosDataLoader = new DataLoader(keys =>console.log({keys}) ||
				Promise.all(
					keys.map(async key => {
						console.log({key})
						try {
							const { weightedScore, totalCounts } = await fetch(
								`http://local.in.ft.com:3000/api/System/${key}`,
							).then(res => res.json());
							return { ...totalCounts, weightedScore };
						} catch (e) {
							console.log(e)
							return {};
						}
					}),
				),
			);

			return context;
		},
		introspection: true,
		formatResponse: (response, { context }) => {
			context.trace.log();
			return response;
		},
		formatError: error => {
			logger.error(
				'GraphQL Error',
				{
					event: 'GRAPHQL_ERROR',
				},
				error,
			);
			return error;
		},
	});

	return apollo.getMiddleware({ path: '/' });
};

module.exports = { getApolloMiddleware };

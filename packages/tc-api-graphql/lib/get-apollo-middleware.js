const { ApolloServer } = require('apollo-server-express');
const {
	logger,
	getContextByRequestId,
} = require('@financial-times/tc-api-express-logger');
const { driver } = require('@financial-times/tc-api-db-manager');
const { getAugmentedSchema } = require('./get-augmented-schema');
const { Tracer } = require('./request-tracer');

const getApolloMiddleware = options => {
	const apollo = new ApolloServer({
		subscriptions: false,
		schema: getAugmentedSchema(options),
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

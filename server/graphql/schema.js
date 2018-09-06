const logger = require('@financial-times/n-logger').default;
const {
	makeExecutableSchema,
	addMockFunctionsToSchema
} = require('graphql-tools');

const resolvers = require('./resolvers');

const { getGraphqlDefs } = require('@financial-times/biz-ops-schema');

module.exports = makeExecutableSchema({
	typeDefs: getGraphqlDefs(),
	resolvers: resolvers.all,
	logger: {
		log(message) {
			logger.error(`GraphQL Schema: ${message}`, {
				event: 'GRAPHQL_SCHEMA_ERROR'
			});
		}
	}
});

module.exports.createMockSchema = mocks => {
	const mockSchema = makeExecutableSchema({
		typeDefs: getGraphqlDefs(),
		resolvers: resolvers.enumResolvers
	});
	addMockFunctionsToSchema({
		schema: mockSchema,
		mocks
	});
	return mockSchema;
};

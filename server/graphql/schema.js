const logger = require('@financial-times/n-logger').default;
const {
	makeExecutableSchema,
	addMockFunctionsToSchema
} = require('graphql-tools');

const resolvers = require('./resolvers');
const schema = require('../../schema');

const generateGraphqlDefs = require('./generate-graphql-defs');

module.exports = makeExecutableSchema({
	typeDefs: generateGraphqlDefs(schema),
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
		typeDefs: generateGraphqlDefs(schema),
		resolvers: resolvers.enumResolvers
	});
	addMockFunctionsToSchema({
		schema: mockSchema,
		mocks
	});
	return mockSchema;
};

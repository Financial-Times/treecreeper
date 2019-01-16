const logger = require('@financial-times/n-logger').default;
const {
	makeExecutableSchema,
	addMockFunctionsToSchema,
} = require('graphql-tools');

const partialRight = require('lodash/partialRight');
const { neo4jgraphql, augmentSchema } = require('neo4j-graphql-js');
const { getTypes, getEnums } = require('@financial-times/biz-ops-schema');

const mapToNeo4j = partialRight(neo4jgraphql, process.env.DEBUG || false);

const enumResolvers = getEnums();

const queryResolvers = getTypes().reduce(
	(query, type) =>
		Object.assign(query, {
			[type.name]: mapToNeo4j,
			[type.pluralName]: mapToNeo4j,
		}),
	{},
);

const resolvers = {
	enumResolvers,
	queryResolvers,
	all: Object.assign({}, enumResolvers, { Query: queryResolvers }),
};

const { getGraphqlDefs } = require('@financial-times/biz-ops-schema');

const schema = augmentSchema(
	makeExecutableSchema({
		typeDefs: getGraphqlDefs(),
		resolvers: resolvers.all,
		logger: {
			log(message) {
				logger.error(`GraphQL Schema: ${message}`, {
					event: 'GRAPHQL_SCHEMA_ERROR',
				});
			},
		},
	}),
	{
		query: true,
		mutation: false,
	},
);

const createMockSchema = mocks => {
	const mockSchema = makeExecutableSchema({
		typeDefs: getGraphqlDefs(),
		resolvers: resolvers.enumResolvers,
	});
	addMockFunctionsToSchema({
		schema: mockSchema,
		mocks,
	});
	return mockSchema;
};

module.exports = { resolvers, createMockSchema, schema };

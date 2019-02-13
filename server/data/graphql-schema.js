const logger = require('@financial-times/n-logger').default;
const {
	makeExecutableSchema,
	addMockFunctionsToSchema,
} = require('graphql-tools');

const partialRight = require('lodash/partialRight');
const { neo4jgraphql, makeAugmentedSchema } = require('neo4j-graphql-js');
const {
	getTypes,
	getEnums,
	getGraphqlDefs,
} = require('@financial-times/biz-ops-schema');

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

const schema = makeAugmentedSchema({
	typeDefs: getGraphqlDefs().join('\n'),
	resolvers: resolvers.all,
	logger: {
		log(message) {
			logger.error(`GraphQL Schema: ${message}`, {
				event: 'GRAPHQL_SCHEMA_ERROR',
			});
		},
	},
	config: { query: true, mutation: false },
});

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

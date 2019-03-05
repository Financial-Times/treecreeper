const logger = require('@financial-times/n-logger').default;
const { makeExecutableSchema } = require('graphql-tools');

const partialRight = require('lodash/partialRight');
const { neo4jgraphql, makeAugmentedSchema } = require('neo4j-graphql-js');
const {
	getTypes,
	getEnums,
	getGraphqlDefs,
} = require('@financial-times/biz-ops-schema');
const { parse } = require('graphql');

const mapToNeo4j = partialRight(neo4jgraphql, process.env.DEBUG || false);

const getResolvers = () => {
	const enumResolvers = getEnums();

	const queryResolvers = getTypes().reduce(
		(query, type) =>
			Object.assign(query, {
				[type.name]: mapToNeo4j,
				[type.pluralName]: mapToNeo4j,
			}),
		{},
	);

	return {
		enumResolvers,
		queryResolvers,
		all: Object.assign({}, enumResolvers, { Query: queryResolvers }),
	};
};

const createSchema = () => {
	const resolvers = getResolvers();
	const typeDefs = getGraphqlDefs();
	// this should throw meaningfully if the defs are invalid;
	parse(typeDefs.join('\n'));
	const makeGraphqlSchema = makeExecutableSchema({
		typeDefs,
		resolvers: resolvers.all,
		logger: {
			log(message) {
				logger.error(`GraphQL Schema: ${message}`, {
					event: 'GRAPHQL_SCHEMA_ERROR',
				});
			},
		},
	});

	const config = { query: true, mutation: false };
	const schema = makeAugmentedSchema({ schema: makeGraphqlSchema, config });
	return schema;
};

module.exports = { getResolvers, createSchema };

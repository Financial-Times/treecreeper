const partialRight = require('lodash/partialRight');
const { neo4jgraphql } = require('neo4j-graphql-js');
const { getTypes, getEnums } = require('@financial-times/biz-ops-schema');

const mapToNeo4j = partialRight(neo4jgraphql, process.env.DEBUG || false);

const enumResolvers = getEnums();

const queryResolvers = getTypes().reduce(
	(query, type) =>
		Object.assign(query, {
			[type.name]: mapToNeo4j,
			[type.pluralName]: mapToNeo4j
		}),
	{}
);

module.exports = {
	enumResolvers,
	queryResolvers,
	all: Object.assign({}, enumResolvers, { Query: queryResolvers })
};

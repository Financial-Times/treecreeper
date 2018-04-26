'use strict';

const { graphqlExpress, graphiqlExpress } = require('apollo-server-express');
const schema = require('../graphQl/schema');
const { driver } = require('../db-connection');

const DEFAULT_QUERY = `{
	System(id: "dewey") {}
}`;

const graphiql = graphQlEndpoint =>
	graphiqlExpress({
		endpointURL: graphQlEndpoint,
		query: DEFAULT_QUERY,
	});

const api = graphqlExpress(({ headers }) => ({
	schema,
	rootValue: {},
	context: {
		driver,
		headers,
	},
}));

module.exports = {
	graphiql,
	api,
};

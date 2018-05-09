'use strict';

const logger = require('@financial-times/n-logger').default;
const { formatError } = require('graphql');
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express');
const schema = require('../graphQl/schema');
const { driver } = require('../db-connection');

const DEFAULT_QUERY = `{
	System(id: "dewey") {
		name
		supportedBy {
			name
			slack
			email
		}
	}
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
	formatError(error) {
		logger.error('GraphQL Error', { event: 'GRAPHQL_ERROR', error });
		return formatError(error);
	},
}));

module.exports = {
	graphiql,
	api,
};

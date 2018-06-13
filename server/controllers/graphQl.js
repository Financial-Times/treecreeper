const logger = require('@financial-times/n-logger').default;
const { formatError } = require('graphql');
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express');
const schema = require('../graphQl/schema');
const { driver } = require('../db-connection');

const DEFAULT_QUERY = `{
  	System(code: "dewey") {
		name
		serviceTier
		primaryURL
		supportedBy {
			name
			slack
			email
			techLead {
				name
				email
			}
			productOwner {
				name
				email
			}
		}
		isKnownBy {
			name
		}
		repository {
			url
			mostRecentCircleCIPlatform
			storedIn {
				name
			}
		}
	}
}`;

const graphiql = graphQlEndpoint =>
	graphiqlExpress({
		endpointURL: graphQlEndpoint,
		query: DEFAULT_QUERY
	});

const api = graphqlExpress(({ headers }) => ({
	schema,
	rootValue: {},
	context: {
		driver,
		headers
	},
	formatError(error) {
		const isS3oError = /Forbidden/i.test(error.message);
		logger.error('GraphQL Error', { event: 'GRAPHQL_ERROR', error });
		const displayedError = isS3oError
			? new Error(
					'FT s3o session has expired. Please reauthenticate via s3o - i.e. refresh the page if using the graphiql explorer'
			  )
			: error;
		return formatError(displayedError);
	}
}));

module.exports = {
	graphiql,
	api
};

const { parse } = require('graphql');
const sdk = require('./sdk');

try {
	parse(sdk.getGraphqlDefs().join('\n'))).not.toThrow()
} catch (error) {
	console.error('GraphQL schema construction failed')
	console.error(error)
	throw error;
}

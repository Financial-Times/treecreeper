const assert = require('assert');
const { parse } = require('graphql');
const sdk = require('../sdk');

module.exports = {
	validateGraphQL: () => {
		assert.doesNotThrow(
			() => parse(sdk.getGraphqlDefs()),
			'GraphQL schema construction failed',
		);
	},
};

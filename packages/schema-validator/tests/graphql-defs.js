/* global it, describe, expect */
const { parse } = require('graphql');
const { SDK } = require('../../../packages/schema-sdk/sdk');

describe('graphql defs', () => {
	it('should be syntactically correct (can be parsed by graphql parser)', () => {
		const sdk = new SDK({
			schemaDirectory: process.env.TREECREEPER_SCHEMA_DIRECTORY,
		});
		sdk.init();
		expect(() => parse(sdk.getGraphqlDefs().join('\n'))).not.toThrow();
	});
});

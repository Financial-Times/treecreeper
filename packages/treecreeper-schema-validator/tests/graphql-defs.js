/* global it, describe, expect */
const { parse } = require('graphql');
const { SDK } = require('@financial-times/treecreeper-schema-sdk/sdk');

describe('graphql defs', () => {
	it('should be syntactically correct (can be parsed by graphql parser)', () => {
		const sdk = new SDK();
		sdk.init();
		expect(() => parse(sdk.getGraphqlDefs().join('\n'))).not.toThrow();
	});
});

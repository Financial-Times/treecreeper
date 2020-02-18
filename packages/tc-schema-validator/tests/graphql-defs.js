/* global it, describe, expect */
const { parse } = require('graphql');
const { SDK, readYaml } = require('@financial-times/tc-schema-sdk');

describe('graphql defs', () => {
	it('should be syntactically correct (can be parsed by graphql parser)', () => {
		const sdk = new SDK({ readYaml });
		sdk.init();
		expect(() => parse(sdk.getGraphqlDefs().join('\n'))).not.toThrow();
	});
});

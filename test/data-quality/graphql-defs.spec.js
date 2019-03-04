const { parse } = require('graphql');
const { getGraphqlDefs } = require('../..');

describe('graphql defs', () => {
	it('should be syntactically correct (can be parsed by graphql parser)', () => {
		expect(() => parse(getGraphqlDefs().join('\n'))).not.toThrow();
	});
});

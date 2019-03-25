const { parse } = require('graphql');
const { init } = require('../..');

describe('graphql defs', () => {
	it('should be syntactically correct (can be parsed by graphql parser)', () => {
		expect(() =>
			parse(
				init()
					.getGraphqlDefs()
					.join('\n'),
			),
		).not.toThrow();
	});
});

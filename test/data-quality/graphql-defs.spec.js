const { parse } = require('graphql');
const { init } = require('../../lib/get-instance');

describe('graphql defs', () => {
	it('should be syntactically correct (can be parsed by graphql parser)', () => {
		parse(
			init()
				.getGraphqlDefs()
				.join('\n'),
		);
		expect(() =>
			parse(
				init()
					.getGraphqlDefs()
					.join('\n'),
			),
		).not.toThrow();
	});
});

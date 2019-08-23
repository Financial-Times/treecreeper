const { parse } = require('graphql');
const { init } = require('../../../packages/schema-sdk/get-instance');

describe('graphql defs', () => {
	it('should be syntactically correct (can be parsed by graphql parser)', () => {
		expect(() =>
			parse(
				init({rawDataDirectory: process.env.TREECREEPER_SCHEMA_DIRECTORY})
					.getGraphqlDefs()
					.join('\n'),
			),
		).not.toThrow();
	});
});

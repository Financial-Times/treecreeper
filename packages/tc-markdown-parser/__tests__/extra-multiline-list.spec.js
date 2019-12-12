const schema = require('@financial-times/tc-schema-sdk');
const { default: here } = require('outdent');
const getParser = require('..');

schema.init({
	updateMode: 'poll',
	logger: console,
});

const parser = getParser({
	type: 'MainType',
});

describe('extra list string', () => {
	it('can be parsed ', async () => {
		const { data, errors } = await parser.parseMarkdownString(here`
			# name

			## culious child

			example-code
				someString:
				  - foo
					- bar
				someBoolean: yes
			`);

		expect(errors).toHaveLength(0);
		expect(data).toEqual({
			name: 'name',
			culiousChild: {
				code: 'example-code',
				someString: ['foo', 'bar'],
				someBoolean: true,
			},
		});
	});
	it('can be parsed with enum list', async () => {
		const { data, errors } = await parser.parseMarkdownString(here`
			# name

			## culious child

			example-code
				someEnum:
				  - First
					- Second
			`);

		expect(errors).toHaveLength(0);
		expect(data).toEqual({
			name: 'name',
			culiousChild: {
				code: 'example-code',
				someEnum: ['First', 'Second'],
			},
		});
	});
});

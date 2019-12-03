const schema = require('@financial-times/tc-schema-sdk');
const { default: here } = require('outdent');
const getParser = require('..');

schema.init({
	updateMode: 'poll',
	logger: console,
});

const parser = getParser(schema, {
	type: 'MainType',
});

test('any top level content outside an h2-range is parsed as description', async () => {
	const { data, errors } = await parser.parseRunbookString(here`
		# well

		hello monkey

		## some string

		https://ft.com?
	`);
	expect(errors.length).toBe(0);
	expect(data).toHaveProperty('description', 'hello monkey');
});

test('top level content in an h2-range is not parsed as description', async () => {
	const { data, errors } = await parser.parseRunbookString(here`
		# i have a heading
		## some string
		how's tricks
	`);
	expect(errors.length).toBe(0);
	expect(data).not.toHaveProperty('description');
});

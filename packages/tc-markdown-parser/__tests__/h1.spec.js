const schema = require('@financial-times/tc-schema-sdk');
const { default: here } = require('outdent');
const { getParser } = require('..');

schema.init({
	updateMode: 'poll',
	logger: console,
});

const parser = getParser({
	type: 'PropertiesTest',
});

test('an h1 is parsed as name by default', async () => {
	const { data, errors } = await parser.parseMarkdownString(here`
		# hello monkey
	`);
	expect(errors.length).toBe(0);
	expect(data).toHaveProperty('name', 'hello monkey');
});

test('an h1 is parsed as configured name', async () => {
	const nameParser = getParser({
		type: 'PropertiesTest',
		titleFieldName: 'configured',
	});
	const { data, errors } = await nameParser.parseMarkdownString(here`
		# hello monkey
	`);
	expect(errors.length).toBe(0);
	expect(data).toHaveProperty('configured', 'hello monkey');
});

test('inline markdown in an H1 is an error', async () => {
	const { data, errors } = await parser.parseMarkdownString(here`
		# Hello *monkey* _don't_ worry about a thing
	`);
	expect(errors.length).toBe(1);
	expect(data).not.toHaveProperty('name');
});

test('more than one h1 is an error', async () => {
	const twoNames = await parser.parseMarkdownString(here`
		# hello monkey

		# also this
	`);

	const nineNames = await parser.parseMarkdownString(here`
		# hello monkey
		# bears
		# also this
		# hello monkey
		# bears
		# also this
		# hello monkey
		# bears
		# also this
	`);

	expect(twoNames.errors.length).toBe(2);
	expect(nineNames.errors.length).toBe(9);
	expect(twoNames.data).not.toHaveProperty('name');
	expect(nineNames.data).not.toHaveProperty('name');
});

test('no h1 is an error', async () => {
	const { data, errors } = await parser.parseMarkdownString(here`
		wow
	`);

	expect(errors.length).toBe(1);
	expect(data).not.toHaveProperty('name');
});

test.skip('content before an h1 is an error', async () => {
	const { data, errors } = await parser.parseMarkdownString(here`
		wow
		# hello
	`);

	expect(errors.length).toBe(1);
	expect(data).not.toHaveProperty('name');
});

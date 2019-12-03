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

test('an h1 is parsed as name', async () => {
	const { data, errors } = await parser.parseRunbookString(here`
		# hello monkey
	`);
	expect(errors.length).toBe(0);
	expect(data).toHaveProperty('name', 'hello monkey');
});

test('inline markdown in an H1 is an error', async () => {
	const { data, errors } = await parser.parseRunbookString(here`
		# Hello *monkey* _don't_ worry about a thing
	`);
	expect(errors.length).toBe(1);
	expect(data).not.toHaveProperty('name');
});

test('more than one h1 is an error', async () => {
	const twoNames = await parser.parseRunbookString(here`
		# hello monkey

		# also this
	`);

	const nineNames = await parser.parseRunbookString(here`
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
	const { data, errors } = await parser.parseRunbookString(here`
		wow
	`);

	expect(errors.length).toBe(1);
	expect(data).not.toHaveProperty('name');
});

test.skip('content before an h1 is an error', async () => {
	const { data, errors } = await parser.parseRunbookString(here`
		wow
		# hello
	`);

	expect(errors.length).toBe(1);
	expect(data).not.toHaveProperty('name');
});

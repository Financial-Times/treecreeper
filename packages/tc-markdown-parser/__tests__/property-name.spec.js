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

test('a valid property name gets correctly coerced', async () => {
	const { data } = await parser.parseRunbookString(here`
		# name

		## some boolean
		yes
	`);

	expect(data).toHaveProperty('someBoolean', true);
});

test('an invalid property name prints an error', async () => {
	const { data, errors } = await parser.parseRunbookString(here`
		# name

		## Contains big monkey
		yes
	`);

	expect(errors).toHaveProperty('length', 1);
	expect(data).toEqual({
		name: 'name',
	});
});

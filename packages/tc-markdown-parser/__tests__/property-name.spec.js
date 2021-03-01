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

describe('a valid property name gets correctly coerced', () => {
	const headings = [
		'boolean property',
		'booleanProperty',
		'boolean property',
		'booleanProperty',
		'boolean property',
		'booleanProperty',
	];
	headings.forEach(heading => {
		it(`${heading} should coerce as booleanProperty`, async () => {
			const { data } = await parser.parseMarkdownString(here`
				# name

				## ${heading}
				yes
				`);

			expect(data).toHaveProperty('booleanProperty', true);
		});
	});
});

test('an invalid property name prints an error', async () => {
	const { data, errors } = await parser.parseMarkdownString(here`
		# name

		## Contains big monkey
		yes
	`);

	expect(errors).toHaveProperty('length', 1);
	expect(data).toEqual({
		name: 'name',
	});
});

test('cannot set same property name in the definition', async () => {
	const { data, errors } = await parser.parseMarkdownString(here`
		# name

		## first string property
		foo

		## first string property
		bar
	`);

	expect(errors).toHaveProperty('length', 1);
	const [{ message }] = errors;
	expect(message).toEqual(
		'Duplicate headings for "firstStringProperty" field. Only one of each heading allowed in the markdown file.',
	);
	expect(data).toEqual({
		name: 'name',
		firstStringProperty: 'foo',
	});
});

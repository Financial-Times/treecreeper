const schema = require('@financial-times/tc-schema-sdk');
const { default: here } = require('outdent');
const { getParser } = require('..');

schema.init({
	updateMode: 'poll',
	logger: console,
});

const parser = getParser({
	type: 'MainType',
});

describe('a valid property name gets correctly coerced', () => {
	const headings = [
		'some boolean',
		'someBoolean',
		'some Boolean',
		'SomeBoolean',
		'Some boolean',
		'SomeBoolean',
	];
	headings.forEach(heading => {
		it(`${heading} should coerce as someBoolean`, async () => {
			const { data } = await parser.parseMarkdownString(here`
				# name

				## ${heading}
				yes
				`);

			expect(data).toHaveProperty('someBoolean', true);
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

		## some string
		foo

		## some string
		bar
	`);

	expect(errors).toHaveProperty('length', 1);
	const [{ message }] = errors;
	expect(message).toEqual(
		'Duplicate headings for "someString" field. Only one of each heading allowed in the markdown file.',
	);
	expect(data).toEqual({
		name: 'name',
		someString: 'foo',
	});
});

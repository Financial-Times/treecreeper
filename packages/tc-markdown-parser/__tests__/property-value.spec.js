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

describe.skip('boolean types are coerced to boolean', () => {
	const expects = {
		yes: true,
		true: true,
		// the headings for these are using the labels
		'👍': true,
		'👎': false,
	};
	Object.entries(expects).forEach(([bool, actual]) => {
		it(`${bool} should be coerced to boolean`, async () => {
			const { data } = await parser.parseMarkdownString(here`
				# name

				## some boolean
				${bool}
			`);
			expect(data).toEqual({
				name: 'name',
				someBoolean: actual,
			});
		});
	});
});

test.skip('boolean fields with non-boolean contents are errors', async () => {
	const { data, errors } = await parser.parseMarkdownString(here`
		# name

		## some boolean
		sure
	`);

	expect(data).toEqual({
		name: 'name',
	});

	expect(errors.length).toBe(1);
	expect(errors[0].message).toMatch(/\bsure\b/);
});

test.skip('string types are coerced to string', async () => {
	const { data } = await parser.parseMarkdownString(here`
		# name

		## some string

		hello

		## another string

		hello
	`);

	expect(typeof data.someString).toBe('string');
	expect(typeof data.anotherString).toBe('string');
});

test.skip('enums types correctly return their value', async () => {
	const { data } = await parser.parseMarkdownString(here`
		# name

		## some enum
		first

	`);

	expect(data.someEnum).toBe('First');
});

test.skip('enums types with incorrect values produce error', async () => {
	const { data, errors } = await parser.parseMarkdownString(here`
		# name

		## some enum

		Fourth
	`);

	expect(data.someEnum).toBe(undefined);
	expect(errors.length).toBe(1);
	const [{ message }] = errors;
	expect(message).toMatch(/\bfourth\b/);
	expect(message).toContain('AnEnum');
});

// Before this test, we had links coming out wrapped in triangle brackets
test.skip('urls should stay urls', async () => {
	const { data } = await parser.parseMarkdownString(here`
		# name

		## some url
		https://snoot.club
	`);

	expect(data.someUrl).toBe('https://snoot.club');
	expect(typeof data.someUrl).toBe('string');
});

test.skip('nested fields are coerced to string (the code)', async () => {
	const { data } = await parser.parseMarkdownString(here`
		# name

		## favourite child

		cheerabbits
	`);

	expect(data.favouriteChild).toBe('cheerabbits');
});

test.skip('properties with hasMany turn bulleted lists into arrays', async () => {
	const { data, errors } = await parser.parseMarkdownString(here`
		# name

		## children

		* chee-rabbits

		## younger siblings

		* ft-app-fruitcake
		* apple-quicktime
	`);

	expect(errors).toHaveLength(0);
	expect(data.children).toEqual(['chee-rabbits']);
	expect(data.youngerSiblings).toEqual([
		'ft-app-fruitcake',
		'apple-quicktime',
	]);
});

test.skip('thows error if defined property is included with blacklist', async () => {
	const blacklistedParser = getParser({
		type: 'MainType',
		blacklistPropertyNames: ['youngerSiblings'],
	});

	const { data, errors } = await blacklistedParser.parseMarkdownString(here`
		# name

		## children

		* chee-rabbits

		## younger siblings

		* ft-app-fruitcake
	`);

	expect(errors).toHaveLength(1);
	expect(data.children).toEqual(['chee-rabbits']);
	const [{ message }] = errors;
	expect(message).toEqual(
		'youngerSiblings is not permitted within markdown (to allow other people to edit it)',
	);
});

test.skip('properties with hasMany must be bulleted lists', async () => {
	const { errors } = await parser.parseMarkdownString(here`
		# name

		## children

		chee-rabbits
	`);

	expect(errors).toHaveLength(1);

	const [{ message }] = errors;
	expect(message).toContain('list');
	expect(message).toContain('bullet');
});

test.skip('properties without hasMany must not be bulleted lists', async () => {
	const { errors } = await parser.parseMarkdownString(here`
		# name

		## some url

		* https://ft.com
	`);

	expect(errors).toHaveLength(1);

	const [{ message }] = errors;
	expect(message).toContain('list');
	expect(message).toContain('bullet');
});

test.skip('subdocuments have their headers reduced two levels', async () => {
	const { data } = await parser.parseMarkdownString(here`
		# name

		## some document

		### hello
	`);

	expect(data).toEqual({
		name: 'name',
		someDocument: '# hello',
	});
});

// There are currently no date fields permitted in runbook.md; lastServiceReviewDate is reserved for Ops manual entry
test.skip('date fields are coerced to iso strings', async () => {
	const naiveJavaScriptIsoStringRegex = /^\d{4}(?:-\d{2}){2}T(?:\d{2}:){2}\d{2}\.\d{3}Z$/;
	const { data } = await parser.parseMarkdownString(here`
		# name

		## some date

		July 21 2018
	`);

	expect(data.someDate).toMatch(naiveJavaScriptIsoStringRegex);
});

test.skip('date fields keep the correct date', async () => {
	const { data } = await parser.parseMarkdownString(here`
		# name

		## some date

		1965-09-17
	`);

	const date = new Date(data.someDate);

	// gotta go fast
	expect(date.getFullYear()).toBe(1965);
	expect(date.getMonth()).toBe(8);
	expect(date.getDate()).toBe(17);
});

test.skip('date fields with bad dates are an error', async () => {
	const { errors } = await parser.parseMarkdownString(here`
		# name

		## some date

		mario's birthday
	`);

	expect(errors).toHaveLength(1);

	const [{ message }] = errors;

	expect(message).toContain("mario's birthday");
	expect(message).toContain('Date');
});

test.skip('explicit empty section should be an error', async () => {
	const { data, errors } = await parser.parseMarkdownString(here`
		# name

		## some string

		## another string

		## some document
		`);
	expect(data).toEqual({
		name: 'name',
	});

	expect(errors).toEqual([
		{
			line: 3,
			message: 'property "someString" has no value',
		},
		{
			line: 5,
			message: 'property "anotherString" has no value',
		},
		{
			line: 7,
			message: 'property "someDocument" has no value',
		},
	]);
});

describe.skip('dealing with html comments', () => {
	it('html comments only in section should not be an error but be omitted in result', async () => {
		const { data, errors } = await parser.parseMarkdownString(here`
			# name

			## some string

			<!-- here is hidden comment -->

			## some document

			<!-- here is hidden comment, too -->

		`);
		expect(errors).toHaveLength(0);
		expect(data).toEqual({
			name: 'name',
		});
	});
	it('including html comments in section should be trimmed', async () => {
		const { data, errors } = await parser.parseMarkdownString(here`
			# name

			## some string

			<!-- here is hidden comment --> hello

			## some document

			<!-- here is hidden comment, too --> hello

		`);
		expect(errors).toHaveLength(0);
		expect(data).toEqual({
			name: 'name',
			someString: 'hello',
			someDocument: 'hello',
		});
	});
});

describe('nested property definitions', () => {
	it('can be parsed as object', async () => {
		const { data, errors } = await parser.parseMarkdownString(here`
			# name

			## younger siblings

			* example-sibling-node:
				propNameOne: propValueOne
				propNameTwo: propValueTwo
		`);

		console.log(data);
		expect(errors).toHaveLength(0);
		expect(data).toEqual({
			name: 'name',
			youngerSiblings: [
				{
					name: 'example-sibling-node',
					properties: {
						propNameOne: 'propValueOne',
						propNameTwo: 'propValueTwo',
					},
				},
			],
		});
	});
});

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

describe('boolean types are coerced to boolean', () => {
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

				## boolean property
				${bool}
			`);
			expect(data).toEqual({
				name: 'name',
				booleanProperty: actual,
			});
		});
	});
});

test('boolean fields with non-boolean contents are errors', async () => {
	const { data, errors } = await parser.parseMarkdownString(here`
		# name

		## boolean property
		sure
	`);

	expect(data).toEqual({
		name: 'name',
	});

	expect(errors.length).toBe(1);
	expect(errors[0].message).toMatch(/\bsure\b/);
});

test('string types are coerced to string', async () => {
	const { data } = await parser.parseMarkdownString(here`
		# name

		## firstStringProperty

		hello

		## secondStringProperty

		hello
	`);

	expect(typeof data.firstStringProperty).toBe('string');
	expect(typeof data.secondStringProperty).toBe('string');
});

describe('enums', () => {
	test('enums types correctly return their value', async () => {
		const { data } = await parser.parseMarkdownString(here`
			# name

			## enumProperty
			first

		`);

		expect(data.enumProperty).toBe('First');
	});

	test('multiple choice types correctly return their value', async () => {
		const { data } = await parser.parseMarkdownString(here`
			# name

			## multiple choice enum property
			- first
			- second

		`);

		expect(data.multipleChoiceEnumProperty).toEqual(['First', 'Second']);
	});

	test('enums must not be a list', async () => {
		const { errors } = await parser.parseMarkdownString(here`
			# name

			## enumProperty
			- first

		`);

		expect(errors).toHaveLength(1);

		const [{ message }] = errors;
		expect(message).toBe('Must provide a single enum, not a nested list');
	});

	test('multiple choice must be a list', async () => {
		const { errors } = await parser.parseMarkdownString(here`
			# name

			## multiple choice enum property
			first

		`);

		expect(errors).toHaveLength(1);

		const [{ message }] = errors;
		expect(message).toBe('Must provide a list of enums');
	});

	test('enums types with incorrect values produce error', async () => {
		const { data, errors } = await parser.parseMarkdownString(here`
			# name

			## enumProperty

			Fourth
		`);

		expect(data.enumProperty).toBe(undefined);
		expect(errors.length).toBe(1);
		const [{ message }] = errors;
		expect(message).toMatch(/\bfourth\b/);
		expect(message).toContain('AnEnum');
	});

	test('multiple choice types with incorrect values produce error', async () => {
		const { data, errors } = await parser.parseMarkdownString(here`
			# name

			## multiple choice enum property

			- Fourth
		`);

		expect(data.someMultipleChoice).toBe(undefined);
		expect(errors.length).toBe(1);
		const [{ message }] = errors;
		expect(message).toMatch(/\bfourth\b/);
		expect(message).toContain('AnEnum');
	});
});

// Before this test, we had links coming out wrapped in triangle brackets
test('urls should stay urls', async () => {
	const { data } = await parser.parseMarkdownString(here`
		# name

		## url property
		https://snoot.club
	`);

	expect(typeof data.urlProperty).toBe('string');
	expect(data.urlProperty).toBe('https://snoot.club');
});

describe.skip('relationship properties', () => {
	test('nested fields are coerced to string (the code)', async () => {
		const { data } = await parser.parseMarkdownString(here`
		# name

		## favourite child

		cheerabbits
	`);

		expect(data.favouriteChild).toMatchObject({
			code: 'cheerabbits',
		});
	});

	test('properties with hasMany turn bulleted lists into arrays', async () => {
		const { data, errors } = await parser.parseMarkdownString(here`
		# name

		## children

		* chee-rabbits

		## younger siblings

		* ft-app-fruitcake
		* apple-quicktime
	`);

		expect(errors).toHaveLength(0);
		expect(data.children).toEqual([
			{
				code: 'chee-rabbits',
			},
		]);
		expect(data.youngerSiblings).toEqual([
			{
				code: 'ft-app-fruitcake',
			},
			{
				code: 'apple-quicktime',
			},
		]);
	});

	test('properties with hasMany must be bulleted lists', async () => {
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

	test('properties without hasMany must not be bulleted lists', async () => {
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
});

test('throws error if defined property is included with blacklist', async () => {
	const blacklistedParser = getParser({
		type: 'PropertiesTest',
		blacklistPropertyNames: ['secondStringProperty'],
	});

	const { data, errors } = await blacklistedParser.parseMarkdownString(here`
		# name

		## first string property

		chee-rabbits

		## second string property

		ft-app-fruitcake
	`);

	expect(errors).toHaveLength(1);
	expect(data.firstStringProperty).toEqual('chee-rabbits');
	const [{ message }] = errors;
	expect(message).toEqual(
		'secondStringProperty is not permitted within markdown (to allow other people to edit it)',
	);
});

test('subdocuments have their headers reduced two levels', async () => {
	const { data } = await parser.parseMarkdownString(here`
		# name

		## document property

		### hello
	`);

	expect(data).toEqual({
		name: 'name',
		documentProperty: '# hello',
	});
});

// There are currently no date fields permitted in runbook.md; lastServiceReviewDate is reserved for Ops manual entry
test('date fields are coerced to iso strings', async () => {
	const naiveJavaScriptIsoStringRegex =
		/^\d{4}(?:-\d{2}){2}T(?:\d{2}:){2}\d{2}\.\d{3}Z$/;
	const { data } = await parser.parseMarkdownString(here`
		# name

		## date property

		July 21 2018
	`);

	expect(data.dateProperty).toMatch(naiveJavaScriptIsoStringRegex);
});

test('date fields keep the correct date', async () => {
	const { data } = await parser.parseMarkdownString(here`
		# name

		## date property

		1965-09-17
	`);

	const date = new Date(data.dateProperty);

	// gotta go fast
	expect(date.getFullYear()).toBe(1965);
	expect(date.getMonth()).toBe(8);
	expect(date.getDate()).toBe(17);
});

test('date fields with bad dates are an error', async () => {
	const { errors } = await parser.parseMarkdownString(here`
		# name

		## date property

		mario's birthday
	`);

	expect(errors).toHaveLength(1);

	const [{ message }] = errors;

	expect(message).toContain("mario's birthday");
	expect(message).toContain('Date');
});

test('explicit empty section should be an error', async () => {
	const { data, errors } = await parser.parseMarkdownString(here`
		# name

		## firstStringProperty

		## secondStringProperty

		## document property
		`);
	expect(data).toEqual({
		name: 'name',
	});

	expect(errors).toEqual([
		{
			line: 3,
			message: 'property "firstStringProperty" has no value',
		},
		{
			line: 5,
			message: 'property "secondStringProperty" has no value',
		},
		{
			line: 7,
			message: 'property "documentProperty" has no value',
		},
	]);
});

describe('dealing with html comments', () => {
	it('html comments only in section should not be an error but be omitted in result', async () => {
		const { data, errors } = await parser.parseMarkdownString(here`
			# name

			## firstStringProperty

			<!-- here is hidden comment -->

			## documentProperty

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

			## firstStringProperty

			<!-- here is hidden comment --> hello

			## documentProperty

			<!-- here is hidden comment, too --> hello

		`);
		expect(errors).toHaveLength(0);
		expect(data).toEqual({
			name: 'name',
			firstStringProperty: 'hello',
			documentProperty: 'hello',
		});
	});
});

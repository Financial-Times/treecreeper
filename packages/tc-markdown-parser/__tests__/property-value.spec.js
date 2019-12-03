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

describe('boolean types are coerced to boolean', () => {
	const expects = {
		'yes': true,
		'true': true,
		// the headings for these are using the labels
		'👍': true,
		'👎': false,
	};
	Object.entries(expects).forEach(([bool, actual]) => {
		it(`${bool} should be coerced to boolean`, async () => {
			const { data } = await parser.parseRunbookString(here`
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

test('boolean fields with non-boolean contents are errors', async () => {
	const { data, errors } = await parser.parseRunbookString(here`
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

test('string types are coerced to string', async () => {
	const { data } = await parser.parseRunbookString(here`
		# name

		## some string

		hello

		## another string

		hello
	`);

	expect(typeof data.someString).toBe('string');
	expect(typeof data.anotherString).toBe('string');
});

test('enums types correctly return their value', async () => {
	const { data } = await parser.parseRunbookString(here`
		# name

		## some enum
		first

	`);

	expect(data.someEnum).toBe('First');
});

test('enums types with incorrect values produce error', async () => {
	const { data, errors } = await parser.parseRunbookString(here`
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
test('urls should stay urls', async () => {
	const { data } = await parser.parseRunbookString(here`
		# name

		## some url
		https://snoot.club
	`);

	expect(data.someUrl).toBe('https://snoot.club');
	expect(typeof data.someUrl).toBe('string');
});

test('nested fields are coerced to string (the code)', async () => {
	const { data } = await parser.parseRunbookString(here`
		# name

		## favourite child

		cheerabbits
	`);

	expect(data.favouriteChild).toBe('cheerabbits');
});

test('properties with hasMany turn bulleted lists into arrays', async () => {
	const { data, errors } = await parser.parseRunbookString(here`
		# name

		## children

		* chee-rabbits

		## younger siblings

		* ft-app-fruitcake
		* apple-quicktime
	`);

	expect(errors).toHaveLength(0);
	expect(data.children).toEqual(['chee-rabbits']);
	expect(data.youngerSiblings).toEqual(['ft-app-fruitcake', 'apple-quicktime']);
});

test.skip('dependents is banned', async () => {
	const { data, errors } = await parser.parseRunbookString(here`
		# name

		## children

		* chee-rabbits

		## dependents

		* ft-app-fruitcake
	`);

	expect(errors).toHaveLength(1);
	expect(data.children).toEqual(['chee-rabbits']);
	const [{ message }] = errors;
	expect(message).toEqual(
		'dependents is not permitted within runbook.md (to allow other people to edit it)',
	);
});

test('properties with hasMany must be bulleted lists', async () => {
	const { errors } = await parser.parseRunbookString(here`
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
	const { errors } = await parser.parseRunbookString(here`
		# name

		## some url

		* https://ft.com
	`);

	expect(errors).toHaveLength(1);

	const [{ message }] = errors;
	expect(message).toContain('list');
	expect(message).toContain('bullet');
});

test('subdocuments have their headers reduced two levels', async () => {
	const { data } = await parser.parseRunbookString(here`
		# name

		## some document

		### hello
	`);

	expect(data).toEqual({
		name: 'name',
		someDocument: '# hello',
	});
});

test.skip('last review date is banned', async () => {
	const { errors } = await parser.parseRunbookString(here`
		# name

		## last review date

		July 21 2018
	`);

	expect(errors).toHaveLength(1);
	const [{ message }] = errors;
	expect(message).toEqual(
		'lastServiceReviewDate is not permitted within runbook.md (to allow other people to edit it)',
	);
});
// There are currently no date fields permitted in runbook.md; lastServiceReviewDate is reserved for Ops manual entry
test('date fields are coerced to iso strings', async () => {
	const naiveJavaScriptIsoStringRegex = /^\d{4}(?:-\d{2}){2}T(?:\d{2}:){2}\d{2}\.\d{3}Z$/;
	const { data } = await parser.parseRunbookString(here`
		# name

		## some date

		July 21 2018
	`);

	expect(data.someDate).toMatch(naiveJavaScriptIsoStringRegex);
});

test('date fields keep the correct date', async () => {
	const { data } = await parser.parseRunbookString(here`
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

test('date fields with bad dates are an error', async () => {
	const { errors } = await parser.parseRunbookString(here`
		# name

		## some date

		mario's birthday
	`);

	expect(errors).toHaveLength(1);

	const [{ message }] = errors;

	expect(message).toContain("mario's birthday");
	expect(message).toContain('Date');
});

test('empty sections are an error', async () => {
	const { data, errors } = await parser.parseRunbookString(here`
		# name

		## some string

		## some document

		## another string

		neat
	`);

	expect(data).toEqual({
		name: 'name',
		anotherString: 'neat',
	});

	expect(errors).toEqual([
		{
			line: 3,
			message: 'property "someString" has no value',
		},
		{
			line: 5,
			message: 'property "someDocument" has no value',
		},
	]);
});

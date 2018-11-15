const { validateAttributeNames } = require('../../');

describe('validateAttributeNames', () => {
	it('accept camel case strings', () => {
		expect(() =>
			validateAttributeNames({ thing: {}, thing2: {}, thingWithThing: {} })
		).not.toThrowError();
	});
	it('rejectOddCapitalisation', () => {
		expect(() => validateAttributeNames({ Thing: {} })).toThrowError(
			/Must be a camelCase string/
		);
	});
	it('reject hyphens', () => {
		expect(() => validateAttributeNames({ 'thi-ng': {} })).toThrowError(
			/Must be a camelCase string/
		);
	});
});

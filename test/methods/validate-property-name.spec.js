const { validatePropertyName } = require('../../');

describe('validatePropertyName', () => {
	it('accept camel case strings', () => {
		expect(() =>
			['thing', 'thing2', 'thingWithThing'].map(validatePropertyName)
		).not.toThrowError();
	});
	it('rejectOddCapitalisation', () => {
		expect(() => validatePropertyName('Thing')).toThrowError(
			/Must be a camelCase string/
		);
	});
	it('reject hyphens', () => {
		expect(() => validatePropertyName('thi-ng')).toThrowError(
			/Must be a camelCase string/
		);
	});
});

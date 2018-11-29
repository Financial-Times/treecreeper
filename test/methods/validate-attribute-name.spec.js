const { validateAttributeName } = require('../../');

describe('validateAttributeName', () => {
	it('accept camel case strings', () => {
		expect(() =>
			['thing', 'thing2', 'thingWithThing'].map(validateAttributeName)
		).not.toThrowError();
	});
	it('rejectOddCapitalisation', () => {
		expect(() => validateAttributeName('Thing')).toThrowError(
			/Must be a camelCase string/
		);
	});
	it('reject hyphens', () => {
		expect(() => validateAttributeName('thi-ng')).toThrowError(
			/Must be a camelCase string/
		);
	});
});

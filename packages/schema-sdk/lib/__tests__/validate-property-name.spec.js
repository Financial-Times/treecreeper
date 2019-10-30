const { SDK } = require('../../sdk');

describe('validatePropertyName', () => {
	const {
		validators: { validatePropertyName },
	} = new SDK();
	it('accept camel case strings', () => {
		expect(() =>
			['thing', 'thing2', 'thingWithThing'].map(validatePropertyName),
		).not.toThrow();
	});
	it('rejectOddCapitalisation', () => {
		expect(() => validatePropertyName('Thing')).toThrow(
			/Must be a camelCase string/,
		);
	});
	it('reject hyphens', () => {
		expect(() => validatePropertyName('thi-ng')).toThrow(
			/Must be a camelCase string/,
		);
	});
});

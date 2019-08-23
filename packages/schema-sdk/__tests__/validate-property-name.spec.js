const { init } = require('../get-instance');

describe('validatePropertyName', () => {
	const { validatePropertyName } = init();
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

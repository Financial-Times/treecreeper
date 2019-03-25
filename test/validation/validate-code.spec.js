const getType = require('../../methods/get-type');
const getValidators = require('../../lib/validate');

describe('validateCode', () => {
	const validators = getValidators(() => ({
		name: 'Thing',
		properties: {
			code: {
				type: 'String',
				validator: /^[^z]+$/, // exclude the letter z
			},
		},
	}));

	afterEach(() => {
		jest.clearAllMocks();
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	it('accept strings', () => {
		expect(() =>
			validators.validateCode('Thing', 'acceptable'),
		).not.toThrow();
	});
	it('not accept booleans', () => {
		expect(() => validators.validateCode('Thing', true)).toThrow(
			/Must be a string/,
		);
		expect(() => validators.validateCode('Thing', false)).toThrow(
			/Must be a string/,
		);
	});
	it('not accept floats', () => {
		expect(() => validators.validateCode('Thing', 1.34)).toThrow(
			/Must be a string/,
		);
	});
	it('not accept integers', () => {
		expect(() => validators.validateCode('Thing', 134)).toThrow(
			/Must be a string/,
		);
	});
	it('apply string patterns', () => {
		expect(() => validators.validateCode('Thing', 'zo-no')).toThrow(
			/Must match pattern/,
		);
	});
});

const getType = require('../../methods/get-type');
const { validateCode } = require('../../');

jest.mock('../../methods/get-type');

describe('validateCode', () => {
	beforeEach(() => {
		jest.mock('../../methods/get-type');

		getType.mockReturnValue({
			name: 'Thing',
			properties: {
				code: {
					type: 'String',
					validator: /^[^z]+$/ //exclude the letter z
				}
			}
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	it('accept strings', () => {
		expect(() => validateCode('Thing', 'acceptable')).not.toThrowError();
	});
	it('not accept booleans', () => {
		expect(() => validateCode('Thing', true)).toThrowError(/Must be a string/);
		expect(() => validateCode('Thing', false)).toThrowError(/Must be a string/);
	});
	it('not accept floats', () => {
		expect(() => validateCode('Thing', 1.34)).toThrowError(/Must be a string/);
	});
	it('not accept integers', () => {
		expect(() => validateCode('Thing', 134)).toThrowError(/Must be a string/);
	});
	it('apply string patterns', () => {
		expect(() => validateCode('Thing', 'zo-no')).toThrowError(
			/Must match pattern/
		);
	});
});

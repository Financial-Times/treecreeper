const sinon = require('sinon');
const getType = require('../../methods/get-type');
const { validateCode } = require('../../');

describe('validateCode', () => {
	const sandbox = sinon.createSandbox();
	beforeEach(() => {
		sandbox.stub(getType, 'method').returns({
			name: 'Thing',
			properties: {
				code: {
					type: 'String',
					validator: /^[^z]+$/ //exclude the letter z
				}
			}
		});
	});

	afterEach(() => sandbox.restore());

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
		expect(() => validateCode('Thing', 'zo-no')).toThrowError(/Must match pattern/);
	});
});

const sinon = require('sinon');
const getType = require('../../methods/get-type');
const getEnums = require('../../methods/get-enums');
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
		expect(() =>
			validateCode('Thing', 'acceptable')
		).not.to.throw();
	});
	it('not accept booleans', () => {
		expect(() => validateCode('Thing', true )).to.throw();
		expect(() => validateCode('Thing', false )).to.throw();
	});
	it('not accept floats', () => {
		expect(() => validateCode('Thing', 1.34 )).to.throw();
	});
	it('not accept integers', () => {
		expect(() => validateCode('Thing', 134 )).to.throw();
	});
	it('apply string patterns', () => {
		expect(() =>
			validateCode('Thing', 'zo-no')
		).to.throw();
	});

});

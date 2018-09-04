const sinon = require('sinon');
const getType = require('../../methods/get-type');
const { validateTypeName } = require('../../');

describe('validateTypeName', () => {
	const sandbox = sinon.createSandbox();
	beforeEach(() => {
		sandbox.stub(getType, 'method');
	});

	afterEach(() => sandbox.restore());
	it('accept names in the list', () => {
		getType.method.returns({
			name: 'Thing'
		});
		expect(() => validateTypeName('Thing')).not.to.throw();
	});
	it('reject names not in the list', () => {
		getType.method.returns();
		expect(() => validateTypeName('Thingo')).to.throw(/Invalid node type/);
	});
});

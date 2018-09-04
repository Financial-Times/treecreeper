const { getTypes } = require('../../');
const getType = require('../../methods/get-type');
const rawData = require('../../lib/raw-data');
const sinon = require('sinon');
const cache = require('../../lib/cache');

describe('get-types', () => {
	const sandbox = sinon.createSandbox();
	beforeEach(() => {
		sandbox.stub(rawData, 'getTypes').returns([
			{
				name: 'Type1'
			},
			{ name: 'Type2' }
		]);
		sandbox.stub(getType, 'method');
		getType.method.callsFake(type => ({ name: type, description: 'woo' }));
	});
	afterEach(() => {
		sandbox.restore();
		cache.clear();
	});
	it('gets all types', () => {
		expect(getTypes({ option: 'value' })).to.eql([
			{
				name: 'Type1',
				description: 'woo'
			},
			{
				name: 'Type2',
				description: 'woo'
			}
		]);
		expect(getType.method).calledWith('Type1', { option: 'value' });
		expect(getType.method).calledWith('Type2', { option: 'value' });
	});
});

const rawData = require('../../lib/raw-data');
const sinon = require('sinon');
const cache = require('../../lib/cache');
const {getRelationships} = require('../../');

describe('get-relationships', () => {
	const sandbox = sinon.createSandbox();
	beforeEach(() => {
		sandbox.stub(rawData, 'getRelationships');

	});

	afterEach(() => {
		cache.clear()
		sandbox.restore()
	})

	it('returns an array', () => {
		rawData.getRelationships.returns({})
		expect(getRelationships('Type')).to.equal([])
	});

	it.only('retrieve relationships pointing away from the node', () => {
		rawData.getRelationships.returns({
			HAS: {
			  type: 'MANY_TO_ONE',
			  fromType: { type: 'Type1', name: 'test-name', description: 'test description', label: 'test label' },
			  toType: { type: 'Type2' }
			}
		});
		expect(getRelationships('Type1')).to.eql({ HAS:
   [ { direction: 'outgoing',
       nodeType: 'Type2',
       hasMany: false,
       name: 'test-name',
       description: 'test description',
       label: 'test label' } ] })

	});

	it('retrieve relationships pointing to the node', () => {

	});

	it('retrieve multiple relationships with same name', () => {

	});

	it('retrieve two relationships when pointing at self', () => {

	});

});

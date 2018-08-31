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
	context('rest api (default) style', () => {


		it('returns an object', () => {
			rawData.getRelationships.returns({})
			expect(getRelationships('Type')).to.eql({})
		});

		it('retrieve relationships pointing away from the node', () => {
			rawData.getRelationships.returns({
				HAS: {
				  type: 'ONE_TO_ONE',
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
			rawData.getRelationships.returns({
				HAS: {
				  type: 'ONE_TO_ONE',
				  fromType: { type: 'Type1' },
				  toType: { type: 'Type2', name: 'test-name', description: 'test description', label: 'test label' }
				}
			});
			expect(getRelationships('Type2')).to.eql({ HAS:
	   [ { direction: 'incoming',
	       nodeType: 'Type1',
	       hasMany: false,
	       name: 'test-name',
	       description: 'test description',
	       label: 'test label' } ] })
		});

		it('retrieve multiple relationships with same name', () => {
			rawData.getRelationships.returns({
				HAS: [{
				  type: 'ONE_TO_ONE',
				  fromType: { type: 'Type1' },
				  toType: { type: 'Type2'}
				}, {
				  type: 'ONE_TO_ONE',
				  fromType: { type: 'Type3' },
				  toType: { type: 'Type1'}
				}]
			});
			expect(getRelationships('Type1')).to.eql({
        "HAS": [
          {
            "description": undefined,
            "direction": "outgoing",
            "hasMany": false,
            "label": undefined,
            "name": undefined,
            "nodeType": "Type2",
          },
          {
            "description": undefined,
            "direction": "incoming",
            "hasMany": false,
            "label": undefined,
            "name": undefined,
            "nodeType": "Type3"
          }
        ]
      }
			)
		});

		it('retrieve two relationships when pointing at self', () => {
			rawData.getRelationships.returns({
				HAS: [{
				  type: 'ONE_TO_ONE',
				  fromType: { type: 'Type1' },
				  toType: { type: 'Type1'}
				}]
			});
			expect(getRelationships('Type1')).to.eql({ HAS:
   [ { direction: 'outgoing',
       nodeType: 'Type1',
       hasMany: false,
       name: undefined,
       description: undefined,
       label: undefined },
     { direction: 'incoming',
       nodeType: 'Type1',
       hasMany: false,
       name: undefined,
       description: undefined,
       label: undefined } ] })
		});
		describe('cardinality', () => {
			['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_ONE', "MANY_TO_MANY"]
				.reduce((arr, card) => arr.concat([[card, 'incoming', [1, 2]], [card, 'outgoing', [2, 1]]]), [])
				.map(([cardinality, direction, [fromNum, toNum]]) => {
					it(`assigns correct cardinality for ${direction} ${cardinality} relationship`, () => {
						rawData.getRelationships.returns({
							HAS: [{
							  type: cardinality,
							  fromType: { type: `Type${fromNum}`},
							  toType: { type: `Type${toNum}`}
							}]
						});
						const hasMany = /(ONE|MANY)_TO_(ONE|MANY)/.exec(cardinality)[toNum] === 'MANY';
						expect(getRelationships('Type1').HAS[0].hasMany).to.equal(hasMany	)
					})
				})
		})

	})

});

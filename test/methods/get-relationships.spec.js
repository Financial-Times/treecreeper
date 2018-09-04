const rawData = require('../../lib/raw-data');
const sinon = require('sinon');
const cache = require('../../lib/cache');
const { getRelationships } = require('../../');

describe('get-relationships', () => {
	const sandbox = sinon.createSandbox();
	beforeEach(() => {
		sandbox.stub(rawData, 'getRelationships');
	});

	afterEach(() => {
		cache.clear();
		sandbox.restore();
	});

	context('flat style (default)', () => {
		it('returns an array', () => {
			rawData.getRelationships.returns({});
			expect(getRelationships('Type')).to.eql([]);
		});

		it('retrieve relationships pointing away from the node', () => {
			rawData.getRelationships.returns({
				HAS: {
					cardinality: 'ONE_TO_ONE',
					fromType: {
						type: 'Type1',
						name: 'test-name',
						description: 'test description',
						label: 'test label'
					},
					toType: { type: 'Type2' }
				}
			});
			expect(getRelationships('Type1')).to.eql([
				{
					neo4jName: 'HAS',
					direction: 'outgoing',
					endNode: 'Type2',
					startNode: 'Type1',
					hasMany: false,
					name: 'test-name',
					description: 'test description',
					label: 'test label'
				}
			]);
		});

		it('retrieve relationships pointing to the node', () => {
			rawData.getRelationships.returns({
				HAS: {
					cardinality: 'ONE_TO_ONE',
					fromType: { type: 'Type1' },
					toType: {
						type: 'Type2',
						name: 'test-name',
						description: 'test description',
						label: 'test label'
					}
				}
			});
			expect(getRelationships('Type2')).to.eql([
				{
					neo4jName: 'HAS',
					direction: 'incoming',
					endNode: 'Type1',
					startNode: 'Type2',
					hasMany: false,
					name: 'test-name',
					description: 'test description',
					label: 'test label'
				}
			]);
		});

		it('retrieve multiple relationships with same name', () => {
			rawData.getRelationships.returns({
				HAS: [
					{
						cardinality: 'ONE_TO_ONE',
						fromType: { type: 'Type1' },
						toType: { type: 'Type2' }
					},
					{
						cardinality: 'ONE_TO_ONE',
						fromType: { type: 'Type3' },
						toType: { type: 'Type1' }
					}
				]
			});
			expect(getRelationships('Type1')).to.eql([
				{
					neo4jName: 'HAS',
					direction: 'outgoing',
					hasMany: false,
					endNode: 'Type2',
					startNode: 'Type1'
				},
				{
					neo4jName: 'HAS',
					direction: 'incoming',
					hasMany: false,
					endNode: 'Type3',
					startNode: 'Type1'
				}
			]);
		});

		it('retrieve two relationships when pointing at self', () => {
			rawData.getRelationships.returns({
				HAS: [
					{
						cardinality: 'ONE_TO_ONE',
						fromType: { type: 'Type1' },
						toType: { type: 'Type1' }
					}
				]
			});
			expect(getRelationships('Type1')).to.eql([
				{
					neo4jName: 'HAS',
					direction: 'outgoing',
					endNode: 'Type1',
					startNode: 'Type1',
					hasMany: false
				},
				{
					neo4jName: 'HAS',
					direction: 'incoming',
					endNode: 'Type1',
					startNode: 'Type1',
					hasMany: false
				}
			]);
		});
		describe('cardinality', () => {
			['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_ONE', 'MANY_TO_MANY']
				.reduce(
					(arr, cardinality) =>
						arr.concat([
							[cardinality, 'incoming', [1, 2]],
							[cardinality, 'outgoing', [2, 1]]
						]),
					[]
				)
				.map(([cardinality, direction, [fromNum, toNum]]) => {
					it(`assigns correct cardinality for ${direction} ${cardinality} relationship`, () => {
						rawData.getRelationships.returns({
							HAS: [
								{
									cardinality,
									fromType: { type: `Type${fromNum}` },
									toType: { type: `Type${toNum}` }
								}
							]
						});
						const hasMany =
							/(ONE|MANY)_TO_(ONE|MANY)/.exec(cardinality)[toNum] === 'MANY';
						expect(
							getRelationships('Type1').find(
								({ neo4jName }) => neo4jName === 'HAS'
							).hasMany
						).to.equal(hasMany);
					});
				});
		});
	});

	context('rest api  style', () => {
		it('returns an object', () => {
			rawData.getRelationships.returns({});
			expect(getRelationships('Type', { structure: 'rest' })).to.eql({});
		});

		it('retrieve relationships pointing away from the node', () => {
			rawData.getRelationships.returns({
				HAS: {
					cardinality: 'ONE_TO_ONE',
					fromType: {
						type: 'Type1',
						name: 'test-name',
						description: 'test description',
						label: 'test label'
					},
					toType: { type: 'Type2' }
				}
			});
			expect(getRelationships('Type1', { structure: 'rest' })).to.eql({
				HAS: [
					{
						direction: 'outgoing',
						nodeType: 'Type2',
						hasMany: false,
						name: 'test-name',
						description: 'test description',
						label: 'test label'
					}
				]
			});
		});

		it('retrieve relationships pointing to the node', () => {
			rawData.getRelationships.returns({
				HAS: {
					cardinality: 'ONE_TO_ONE',
					fromType: { type: 'Type1' },
					toType: {
						type: 'Type2',
						name: 'test-name',
						description: 'test description',
						label: 'test label'
					}
				}
			});
			expect(getRelationships('Type2', { structure: 'rest' })).to.eql({
				HAS: [
					{
						direction: 'incoming',
						nodeType: 'Type1',
						hasMany: false,
						name: 'test-name',
						description: 'test description',
						label: 'test label'
					}
				]
			});
		});

		it('retrieve multiple relationships with same name', () => {
			rawData.getRelationships.returns({
				HAS: [
					{
						cardinality: 'ONE_TO_ONE',
						fromType: { type: 'Type1' },
						toType: { type: 'Type2' }
					},
					{
						cardinality: 'ONE_TO_ONE',
						fromType: { type: 'Type3' },
						toType: { type: 'Type1' }
					}
				]
			});
			expect(getRelationships('Type1', { structure: 'rest' })).to.eql({
				HAS: [
					{
						description: undefined,
						direction: 'outgoing',
						hasMany: false,
						label: undefined,
						name: undefined,
						nodeType: 'Type2'
					},
					{
						description: undefined,
						direction: 'incoming',
						hasMany: false,
						label: undefined,
						name: undefined,
						nodeType: 'Type3'
					}
				]
			});
		});

		it('retrieve two relationships when pointing at self', () => {
			rawData.getRelationships.returns({
				HAS: [
					{
						cardinality: 'ONE_TO_ONE',
						fromType: { type: 'Type1' },
						toType: { type: 'Type1' }
					}
				]
			});
			expect(getRelationships('Type1', { structure: 'rest' })).to.eql({
				HAS: [
					{
						direction: 'outgoing',
						nodeType: 'Type1',
						hasMany: false,
						name: undefined,
						description: undefined,
						label: undefined
					},
					{
						direction: 'incoming',
						nodeType: 'Type1',
						hasMany: false,
						name: undefined,
						description: undefined,
						label: undefined
					}
				]
			});
		});
		describe('cardinality', () => {
			['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_ONE', 'MANY_TO_MANY']
				.reduce(
					(arr, cardinality) =>
						arr.concat([
							[cardinality, 'incoming', [1, 2]],
							[cardinality, 'outgoing', [2, 1]]
						]),
					[]
				)
				.map(([cardinality, direction, [fromNum, toNum]]) => {
					it(`assigns correct cardinality for ${direction} ${cardinality} relationship`, () => {
						rawData.getRelationships.returns({
							HAS: [
								{
									cardinality,
									fromType: { type: `Type${fromNum}` },
									toType: { type: `Type${toNum}` }
								}
							]
						});
						const hasMany =
							/(ONE|MANY)_TO_(ONE|MANY)/.exec(cardinality)[toNum] === 'MANY';
						expect(
							getRelationships('Type1', { structure: 'rest' }).HAS[0].hasMany
						).to.equal(hasMany);
					});
				});
		});
	});

	context.skip('graphql style', () => {
		it('is not tested yet', () => {});

	})
});

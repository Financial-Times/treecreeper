const rawData = require('../../lib/raw-data');
const sinon = require('sinon');
const cache = require('../../lib/cache');
const { getRelationships } = require('../../');

const extractFields = (...fieldNames) => obj => {
	return fieldNames.reduce(
		(target, name) => Object.assign(target, { [name]: obj[name] }),
		{}
	);
};

const mocks = {
	pointingAway: [{
		name: 'Type1',
		properties: {
			'test-name': {
				type: 'Type2',
				direction: 'outgoing',
				relationship: 'HAS',
				label: 'test label',
				description: 'test description'
			}
		}
	}],
	pointingTo: [{
		name: 'Type2',
		properties: {
			'test-name': {
				type: 'Type1',
				direction: 'incoming',
				relationship: 'HAS',
				label: 'test label',
				description: 'test description'
			}
		}
	}],
	sameUnderlyingRelationship: [{
		name: 'Type1',
		properties: {
			'test-name1': {
				type: 'Type2',
				direction: 'outgoing',
				relationship: 'HAS',
			},
			'test-name2': {
				type: 'Type3',
				direction: 'incoming',
				relationship: 'HAS',
			}
		}
	}],
	selfReferencing: [{
		name: 'Type1',
		properties: {
			'test-name1': {
				type: 'Type1',
				direction: 'outgoing',
				relationship: 'HAS',
			},
			'test-name2': {
				type: 'Type1',
				direction: 'incoming',
				relationship: 'HAS',
			}
		}
	}]
}

describe('get-relationships', () => {
	const sandbox = sinon.createSandbox();
	beforeEach(() => {
		sandbox.stub(rawData, 'getTypes');
	});

	afterEach(() => {
		cache.clear();
		sandbox.restore();
	});

	context.only('flat style (default)', () => {
		it('returns an array', () => {
			rawData.getTypes.returns([{name: 'Type'}]);
			expect(getRelationships('Type')).to.eql([]);
		});

		it('retrieve relationships pointing away from the node', () => {
			rawData.getTypes.returns(mocks.pointingAway);
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
			rawData.getTypes.returns(mocks.pointingTo);
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
			rawData.getTypes.returns(mocks.sameUnderlyingRelationship);
			expect(getRelationships('Type1')).to.eql([
				{
					neo4jName: 'HAS',
					direction: 'outgoing',
					hasMany: false,
					endNode: 'Type2',
					name: 'test-name1',
					startNode: 'Type1'
				},
				{
					neo4jName: 'HAS',
					direction: 'incoming',
					hasMany: false,
					endNode: 'Type3',
					name: 'test-name2',
					startNode: 'Type1'
				}
			]);
		});

		it('retrieve two relationships when pointing at self', () => {
			rawData.getTypes.returns(mocks.selfReferencing);
			expect(getRelationships('Type1')).to.eql([
				{
					neo4jName: 'HAS',
					direction: 'outgoing',
					endNode: 'Type1',
					startNode: 'Type1',
					name: 'test-name1',
					hasMany: false
				},
				{
					neo4jName: 'HAS',
					direction: 'incoming',
					endNode: 'Type1',
					startNode: 'Type1',
					name: 'test-name2',
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
						rawData.getTypes.returns([{
							HAS: [
								{
									cardinality,
									fromType: { type: `Type${fromNum}` },
									toType: { type: `Type${toNum}` }
								}
							]
						}]);
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
			rawData.getTypes.returns([{
				name: 'Type1',
				properties: {
					'test-name': {
						type: 'Type2',
						direction: 'outgoing',
						relationship: 'HAS',
						label: 'test label',
						description: 'test description'
					}
				}
			}]);
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
			rawData.getTypes.returns({
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

	context('graphql style', () => {
		it('returns an array', () => {
			rawData.getRelationships.returns({});
			expect(getRelationships('Type', { structure: 'graphql' })).to.eql([]);
		});

		it('retrieve relationships pointing away from the node', () => {
			rawData.getTypes.returns([{
				name: 'Type1',
				properties: {
					'test-name': {
						type: 'Type2',
						direction: 'outgoing',
						relationship: 'HAS',
						label: 'test label',
						description: 'test description'
					}
				}
			}]);
			expect(getRelationships('Type1', { structure: 'graphql' })).to.eql([
				{
					neo4jName: 'HAS',
					direction: 'outgoing',
					type: 'Type2',
					hasMany: false,
					isRelationship: true,
					isRecursive: false,
					name: 'test-name',
					description: 'test description',
					label: 'test label'
				}
			]);
		});

		it('retrieve relationships pointing to the node', () => {
			rawData.getTypes.returns({
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
			expect(getRelationships('Type2', { structure: 'graphql' })).to.eql([
				{
					neo4jName: 'HAS',
					direction: 'incoming',
					type: 'Type1',
					isRelationship: true,
					isRecursive: false,
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
						fromType: { type: 'Type1', name: 'name1a' },
						toType: { type: 'Type2', name: 'name1b' }
					},
					{
						cardinality: 'ONE_TO_ONE',
						fromType: { type: 'Type3', name: 'name2a' },
						toType: { type: 'Type1', name: 'name2b' }
					}
				]
			});
			expect(
				getRelationships('Type1', { structure: 'graphql' }).map(
					extractFields('name', 'direction')
				)
			).to.eql([
				{
					direction: 'outgoing',
					name: 'name1a'
				},
				{
					direction: 'incoming',
					name: 'name2b'
				}
			]);
		});

		it('retrieve two relationships when pointing at self', () => {
			rawData.getRelationships.returns({
				HAS: [
					{
						cardinality: 'ONE_TO_ONE',
						fromType: { type: 'Type1', name: 'name-outgoing' },
						toType: { type: 'Type1', name: 'name-incoming' }
					}
				]
			});
			expect(
				getRelationships('Type1', { structure: 'graphql' }).map(
					extractFields('name', 'direction')
				)
			).to.eql([
				{
					direction: 'outgoing',
					name: 'name-outgoing'
				},
				{
					direction: 'incoming',
					name: 'name-incoming'
				}
			]);
		});
		it('define recursive relationships', () => {
			rawData.getRelationships.returns({
				HAS: [
					{
						cardinality: 'ONE_TO_ONE',
						fromType: {
							type: 'Type1',
							name: 'name1',
							recursiveName: 'recursiveName1',
							recursiveDescription: 'recursiveDescription1'
						},
						toType: { type: 'Type2' }
					}
				]
			});

			expect(getRelationships('Type1', { structure: 'graphql' })).to.eql([
				{
					type: 'Type2',
					hasMany: false,
					direction: 'outgoing',
					name: 'name1',
					isRecursive: false,
					isRelationship: true,
					neo4jName: 'HAS',
					description: undefined,
					label: undefined
				},
				{
					type: 'Type2',
					hasMany: false,
					direction: 'outgoing',
					name: 'recursiveName1',
					isRecursive: true,
					isRelationship: true,
					neo4jName: 'HAS',
					description: 'recursiveDescription1',
					label: undefined
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
									fromType: { type: `Type${fromNum}`, name: `name${fromNum}` },
									toType: { type: `Type${toNum}`, name: `name${toNum}` }
								}
							]
						});
						const hasMany =
							/(ONE|MANY)_TO_(ONE|MANY)/.exec(cardinality)[toNum] === 'MANY';
						expect(
							getRelationships('Type1', { structure: 'graphql' }).find(
								({ neo4jName }) => neo4jName === 'HAS'
							).hasMany
						).to.equal(hasMany);
					});
				});
		});
	});
});

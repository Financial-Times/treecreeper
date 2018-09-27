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
	}],
	cardinality: (([cardinality, direction, [fromNum, toNum]]) => [{
		name: `Type${fromNum}`
	},
	{
		name: `Type${toNum}`
	}

	]
}

describe.only('get-relationships', () => {
	const sandbox = sinon.createSandbox();
	beforeEach(() => {
		sandbox.stub(rawData, 'getTypes');
	});

	afterEach(() => {
		cache.clear();
		sandbox.restore();
	});

	context('flat style (default)', () => {
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
		// describe('cardinality', () => {
		// 	['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_ONE', 'MANY_TO_MANY']
		// 		.reduce(
		// 			(arr, cardinality) =>
		// 				arr.concat([
		// 					[cardinality, 'incoming', [1, 2]],
		// 					[cardinality, 'outgoing', [2, 1]]
		// 				]),
		// 			[]
		// 		)
		// 		.map(([cardinality, direction, [fromNum, toNum]]) => {
		// 			it(`assigns correct cardinality for ${direction} ${cardinality} relationship`, () => {
		// 				rawData.getTypes.returns([{
		// 					HAS: [
		// 						{
		// 							cardinality,
		// 							fromType: { type: `Type${fromNum}` },
		// 							toType: { type: `Type${toNum}` }
		// 						}
		// 					]
		// 				}]);
		// 				const hasMany =
		// 					/(ONE|MANY)_TO_(ONE|MANY)/.exec(cardinality)[toNum] === 'MANY';
		// 				expect(
		// 					getTypes('Type1').find(
		// 						({ neo4jName }) => neo4jName === 'HAS'
		// 					).hasMany
		// 				).to.equal(hasMany);
		// 			});
		// 		});
		// });
	});

	context('rest api  style', () => {
		it('returns an object', () => {
			rawData.getTypes.returns([{name: 'Type'}]);
			expect(getRelationships('Type', { structure: 'rest' })).to.eql({});
		});

		it('retrieve relationships pointing away from the node', () => {
			rawData.getTypes.returns(mocks.pointingAway);
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
			rawData.getTypes.returns(mocks.pointingTo);
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
			rawData.getTypes.returns(mocks.sameUnderlyingRelationship);
			expect(getRelationships('Type1', { structure: 'rest' })).to.eql({
				HAS: [
					{
						description: undefined,
						direction: 'outgoing',
						hasMany: false,
						label: undefined,
						name: 'test-name1',
						nodeType: 'Type2'
					},
					{
						description: undefined,
						direction: 'incoming',
						hasMany: false,
						label: undefined,
						name: 'test-name2',
						nodeType: 'Type3'
					}
				]
			});
		});

		it('retrieve two relationships when pointing at self', () => {
			rawData.getTypes.returns(mocks.selfReferencing);
			expect(getRelationships('Type1', { structure: 'rest' })).to.eql({
				HAS: [
					{
						direction: 'outgoing',
						nodeType: 'Type1',
						hasMany: false,
						name: 'test-name1',
						description: undefined,
						label: undefined
					},
					{
						direction: 'incoming',
						nodeType: 'Type1',
						hasMany: false,
						name: 'test-name2',
						description: undefined,
						label: undefined
					}
				]
			});
		});
		describe.only('cardinality', () => {
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
						rawData.getTypes.returns({
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
							getTypes('Type1', { structure: 'rest' }).HAS[0].hasMany
						).to.equal(hasMany);
					});
				});
		});
	});

	context('graphql style', () => {
		it('returns an array', () => {
			rawData.getTypes.returns([{name: 'Type'}]);
			expect(getRelationships('Type', { structure: 'graphql' })).to.eql([]);
		});

		it('retrieve relationships pointing away from the node', () => {
			rawData.getTypes.returns(mocks.pointingAway);
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
			rawData.getTypes.returns(mocks.pointingTo);
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
			rawData.getTypes.returns(mocks.sameUnderlyingRelationship);
			expect(
				getRelationships('Type1', { structure: 'graphql' }).map(
					extractFields('name', 'direction')
				)
			).to.eql([
				{
					direction: 'outgoing',
					name: 'test-name1'
				},
				{
					direction: 'incoming',
					name: 'test-name2'
				}
			]);
		});

		it('retrieve two relationships when pointing at self', () => {
			rawData.getTypes.returns(mocks.selfReferencing);
			expect(
				getRelationships('Type1', { structure: 'graphql' }).map(
					extractFields('name', 'direction')
				)
			).to.eql([
				{
					direction: 'outgoing',
					name: 'test-name1'
				},
				{
					direction: 'incoming',
					name: 'test-name2'
				}
			]);
		});
		it('define recursive relationships', () => {
			rawData.getTypes.returns([{
				name: 'Type1',
				properties: {
					'test-name': {
						type: 'Type2',
						direction: 'outgoing',
						isRecursive: true,
						relationship: 'HAS',
						label: 'test label',
						description: 'test description'
					}
				}
			}]);

			expect(getRelationships('Type1', { structure: 'graphql' })).to.eql([
				{
					type: 'Type2',
					hasMany: false,
					direction: 'outgoing',
					name: 'test-name',
					isRecursive: false,
					isRelationship: true,
					neo4jName: 'HAS',
					description: 'test description',
					label: 'test label'
				}
			]);
		});

		describe.skip('cardinality', () => {
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
						rawData.getTypes.returns({
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

const sinon = require('sinon');
const getType = require('../../methods/get-type');
const { validateRelationship } = require('../../');
const cache = require('../../lib/cache');

describe('validateRelationship', () => {
	const sandbox = sinon.createSandbox();
	beforeEach(() => {
		sandbox.stub(getType, 'method');
	});

	afterEach(() => {
		cache.clear();
		sandbox.restore();
	});

	it('reject when start node type is invalid', () => {
		getType.method.withArgs('NotType').returns(undefined);
		expect(() =>
			validateRelationship({
				nodeType: 'NotType',
				relatedType: 'Thing',
				relationshipType: 'HAS',
				relatedCode: 'code'
			})
		).to.throw(/Invalid node type/);
	});

	describe('when start node is guaranteed to be valid', () => {
		beforeEach(() => {
			getType.method.withArgs('StartType').returns({
				name: 'StartType',
				properties: {
					code: { validator: /^[A-Z]+$/, type: 'String' }
				},
				relationships: [
					{
						neo4jName: 'HAS',
						direction: 'outgoing',
						endNode: 'EndType',
						startNode: 'StartType',
						hasMany: false,
						name: 'test-name',
						description: 'test description',
						label: 'test label'
					}
				]
			});
			getType.method.withArgs('EndType').returns({
				name: 'endType',
				properties: {
					code: { validator: /^[a-z]+$/, type: 'String' }
				},
				relationships: [
					{
						neo4jName: 'HAS',
						direction: 'incoming',
						endNode: 'StartType',
						startNode: 'EndType',
						hasMany: false,
						name: 'test-name',
						description: 'test description',
						label: 'test label'
					}
				]
			});

			getType.method.withArgs('NoType').returns(undefined);

			getType.method.withArgs('OrphanType').returns({
				name: 'OrphanType',
				properties: {
					code: { validator: /^[a-z]+$/ }
				}
			});
		});

		it('reject when related node type is invalid', () => {
			expect(() =>
				validateRelationship({
					nodeType: 'StartType',
					relatedType: 'NoType',
					relationshipType: 'HAS',
					relatedCode: 'code'
				})
			).to.throw(/Invalid node type/);
		});

		it('reject when related node code is invalid', () => {
			expect(() =>
				validateRelationship({
					nodeType: 'StartType',
					relatedType: 'EndType',
					relationshipType: 'HAS',
					relatedCode: 'CODE'
				})
			).to.throw(/Invalid node identifier/);
		});

		it('reject when relationship not defined on start node', () => {
			expect(() =>
				validateRelationship({
					nodeType: 'StartType',
					relatedType: 'EndType',
					relationshipType: 'HASNT',
					relatedCode: 'code'
				})
			).to.throw(/is not a valid relationship on/);
		});

		it('reject when relationship not defined between start node and end node', () => {
			expect(() =>
				validateRelationship({
					nodeType: 'StartType',
					relatedType: 'OrphanType',
					relationshipType: 'HAS',
					relatedCode: 'code'
				})
			).to.throw(/is not a valid relationship between/);
		});

		it('reject when relationship not defined in correct direction  between start node and end node', () => {
			expect(() =>
				validateRelationship({
					nodeType: 'EndType',
					relatedType: 'StartType',
					relationshipType: 'HAS',
					relatedCode: 'CODE'
				})
			).to.throw(/is not a valid relationship from/);
		});

		it('accept when all is correct', () => {
			expect(() =>
				validateRelationship({
					nodeType: 'StartType',
					relatedType: 'EndType',
					relationshipType: 'HAS',
					relatedCode: 'code'
				})
			).not.to.throw();
		});
	});
});

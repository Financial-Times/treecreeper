const { getType } = require('../../');
const rawData = require('../../lib/raw-data');
const sinon = require('sinon');
const cache = require('../../lib/cache');
const getRelationships = require('../../methods/get-relationships');
describe('get-type', () => {
	const sandbox = sinon.createSandbox();
	beforeEach(() => {
		sandbox.stub(rawData, 'getTypes');
		sandbox.stub(rawData, 'getStringPatterns');
	});

	afterEach(() => {
		cache.clear();
		sandbox.restore();
	});

	it('returns all properties of a type', async () => {
		const type1 = {
			name: 'Type1',
			description: 'I am Type1',
			properties: {
				property1: {
					type: 'String'
				},
				property2: {
					type: 'Boolean'
				}
			}
		};
		rawData.getTypes.returns([{ name: 'DummyType' }, type1]);
		const type = getType('Type1');
		expect(type.name).to.equal('Type1');
		expect(type.description).to.equal('I am Type1');
		expect(type.properties).to.eql(type1.properties);
	});

	it('generates plural name if necessary', async () => {
		rawData.getTypes.returns([
			{
				name: 'Type1'
			}
		]);
		const type = getType('Type1');
		expect(type.pluralName).to.equal('Type1s');
	});

	it('does not override manually set plural name', async () => {
		rawData.getTypes.returns([
			{
				name: 'Type1',
				pluralName: 'Type1ticles'
			}
		]);
		const type = getType('Type1');
		expect(type.pluralName).to.equal('Type1ticles');
	});

	it('converts string patterns to regex based function', async () => {
		rawData.getTypes.returns([
			{
				name: 'Type1',
				properties: {
					code: {
						type: 'String',
						pattern: 'CODE'
					}
				}
			}
		]);
		rawData.getStringPatterns.returns({
			CODE: '^ab$'
		});
		const type = getType('Type1');
		const validator = type.properties.code.pattern;
		expect(validator.test('ay')).to.be.false;
		expect(validator.test('zb')).to.be.false;
		expect(validator.test('ab')).to.be.true;
	});

	it('converts string patterns with regex flags to regex based function', async () => {
		rawData.getTypes.returns([
			{
				name: 'Type1',
				properties: {
					code: {
						type: 'String',
						pattern: 'CODE2'
					}
				}
			}
		]);
		rawData.getStringPatterns.returns({
			CODE2: {
				pattern: '^ab$',
				flags: 'i'
			}
		});
		const type = getType('Type1');
		const validator = type.properties.code.pattern;
		expect(validator.test('AB')).to.be.true;
	});

	describe('with grouped relationships', () => {
		it('it includes relationship definitions', async () => {
			sandbox.stub(getRelationships, 'method');

			rawData.getTypes.returns([
				{
					name: 'Type1'
				}
			]);

			getRelationships.method.returns(['dummy relationship structure']);
			const type = getType('Type1', { relationshipStructure: 'grouped' });
			expect(getRelationships.method).calledWith('Type1', {
				structure: 'grouped'
			});
			expect(type.relationships).to.eql(['dummy relationship structure']);
		});
	});

	describe.skip('withGraphQLRelationships', () => {
		it('it includes singular graphql properties', async () => {});

		it('it includes plural graphql properties', async () => {});

		it('it includes recursive graphql properties', async () => {});
	});
});

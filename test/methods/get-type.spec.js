const getType = require('../../').getType;
const rawData = require('../../lib/raw-data');
const sinon = require('sinon');

describe('get-type', () => {
	const sandbox = sinon.createSandbox();
	beforeEach(() => {
		sandbox.stub(rawData, 'getTypes');
		sandbox.stub(rawData, 'getStringPatterns');
	});

	afterEach(() => sandbox.restore())

	it('returns all properties of a type', async () => {
		const type1 ={
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
		rawData.getTypes.returns([{name: 'DummyType'},type1]);
		const type = getType('Type1');
		expect(type.name).to.equal('Type1');
		expect(type.description).to.equal('I am Type1');
		expect(type.properties).to.eql(type1.properties)
	});

	it('generates plural name if necessary', async () => {
		rawData.getTypes.returns([{
			name: 'Type1'
		}]);
		const type = getType('Type1');
		expect(type.pluralName).to.equal('Type1s');
	});

	it('does not override manually set plural name', async () => {
		rawData.getTypes.returns([{
			name: 'Type1',
			pluralName: 'Type1ticles'
		}]);
		const type = getType('Type1');
		expect(type.pluralName).to.equal('Type1ticles');
	});

	it('converts string patterns to regex based function', async () => {
		rawData.getTypes.returns([{
			name: 'Type1',
			properties: {
				code: {
					type: 'String',
					pattern: 'CODE'
				}
			}
		}]);
		rawData.getStringPatterns.returns({
			CODE: '^ab$'
		});
		const type = getType('Type1');
		const validator = type.properties.code.pattern
		expect(validator('ay')).to.be.false;
		expect(validator('zb')).to.be.false;
		expect(validator('ab')).to.be.true;
	});

	it('converts string patterns with regex flags to regex based function', async () => {
		rawData.getTypes.returns([{
			name: 'Type1',
			properties: {
				code: {
					type: 'String',
					pattern: 'CODE2'
				}
			}
		}]);
		rawData.getStringPatterns.returns({
			CODE2: {
				pattern: '^ab$',
				flags: 'i'
			}
		});
		const type = getType('Type1');
		const validator = type.properties.code.pattern
		expect(validator('AB')).to.be.true;
	});

	describe.skip('withGraphQLRelationships', () => {
		it('it includes singular graphql properties', async () => {

		});

		it('it includes plural graphql properties', async () => {

		});

		it('it includes recursive graphql properties', async () => {

		});
	});
	describe.skip('withNeo4jRelationships', () => {
		it('it includes relationship definitions', async () => {

		});
	});

})

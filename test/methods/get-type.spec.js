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
		const validator = type.properties.code.validator;
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
		const validator = type.properties.code.validator;
		expect(validator.test('AB')).to.be.true;
	});

	it('it maps types to graphql properties', async () => {
		rawData.getTypes.returns([
			{
				name: 'Type1',
				properties: {
					primitiveProp: {
						type: 'Word'
					},
					documentProp: {
						type: 'Document'
					},
					enumProp: {
						type: 'SomeEnum'
					}
				}
			}
		]);

		const type = getType('Type1', { primitiveTypes: 'graphql' });
		expect(type.properties.primitiveProp).to.eql({ type: 'String' });
		expect(type.properties.documentProp).to.not.exist;
		expect(type.properties.enumProp).to.eql({ type: 'SomeEnum' });
	});

	it('groups properties by fieldset', () => {
		rawData.getTypes.returns([
			{
				name: 'Type1',
				properties: {
					mainProp: {
						type: 'Word',
						fieldset: 'main',
						label: 'A word'
					},
					secondaryProp: {
						type: 'Document',
						fieldset: 'self',
						label: 'Standalone'
					},
					miscProp: {
						type: 'SomeEnum'
					}
				},
				fieldsets: {
					main: {
						heading: 'Main properties',
						description: 'Fill these out please'
					},
					secondary: {
						heading: 'Secondary properties',
						description: 'Fill these out optionally'
					}
				}
			}
		]);

		const type = getType('Type1', { groupProperties: true });
		expect(type.properties).to.not.exist;
		expect(type.fieldsets.main.properties.mainProp).to.exist;
		expect(type.fieldsets.main.properties.mainProp.label).to.equal('A word');
		expect(type.fieldsets.main.heading).to.equal('Main properties');
		expect(type.fieldsets.main.description).to.equal('Fill these out please');
		expect(type.fieldsets.secondaryProp.properties.secondaryProp).to.exist;
		expect(type.fieldsets.secondaryProp.properties.secondaryProp.labbel).to.not
			.exist;
		expect(type.fieldsets.secondaryProp.heading).to.equal('Standalone');
		expect(type.fieldsets.secondaryProp.description).to.not.exist;
		expect(type.fieldsets.misc.properties.miscProp).to.exist;
		expect(type.fieldsets.misc.heading).to.equal('Miscellaneous');
		expect(type.fieldsets.misc.description).not.to.exist;
	});

	it('not have empty fieldsets', () => {
		rawData.getTypes.returns([
			{
				name: 'Type1',
				properties: {
					mainProp: {
						type: 'Word',
						fieldset: 'main'
					}
				},
				fieldsets: {
					main: {
						heading: 'Main properties',
						description: 'Fill these out please'
					},
					secondary: {
						heading: 'Secondary properties',
						description: 'Fill these out optionally'
					}
				}
			}
		]);

		const type = getType('Type1', { groupProperties: true });
		expect(type.properties).to.not.exist;
		expect(type.fieldsets.secondary).to.not.exist;
		expect(type.fieldsets.misc).to.not.exist;
	});

	it('handle lack of custom fieldsets well when grouping', () => {
		rawData.getTypes.returns([
			{
				name: 'Type1',
				properties: {
					mainProp: {
						type: 'Word'
					},
					secondaryProp: {
						type: 'Document',
						label: 'Standalone'
					},
					miscProp: {
						type: 'SomeEnum'
					}
				}
			}
		]);

		const type = getType('Type1', { groupProperties: true });
		expect(type.properties).to.not.exist;
		expect(type.fieldsets.misc.properties.mainProp).to.exist;
		expect(type.fieldsets.misc.properties.secondaryProp).to.exist;
		expect(type.fieldsets.misc.properties.miscProp).to.exist;
		expect(type.fieldsets.misc.heading).to.equal('General');
	});

	describe('relationships', () => {
		it('it includes rest api relationship definitions', async () => {
			sandbox.stub(getRelationships, 'method');

			rawData.getTypes.returns([
				{
					name: 'Type1'
				}
			]);

			getRelationships.method.returns(['dummy relationship structure']);
			const type = getType('Type1', { relationshipStructure: 'rest' });
			expect(getRelationships.method).calledWith('Type1', {
				structure: 'rest'
			});
			expect(type.relationships).to.eql(['dummy relationship structure']);
		});

		it('it includes flat relationship definitions', async () => {
			sandbox.stub(getRelationships, 'method');

			rawData.getTypes.returns([
				{
					name: 'Type1'
				}
			]);

			getRelationships.method.returns(['dummy relationship structure']);
			const type = getType('Type1', { relationshipStructure: 'flat' });
			expect(getRelationships.method).calledWith('Type1', {
				structure: 'flat'
			});
			expect(type.relationships).to.eql(['dummy relationship structure']);
		});

		it('it merges graphql properties', async () => {
			sandbox.stub(getRelationships, 'method');

			rawData.getTypes.returns([
				{
					name: 'Type1',
					properties: {}
				}
			]);

			getRelationships.method.returns([{ name: 'relProp' }]);
			const type = getType('Type1', { relationshipStructure: 'graphql' });
			expect(getRelationships.method).calledWith('Type1', {
				structure: 'graphql'
			});
			expect(type.properties.relProp).to.eql({ name: 'relProp' });
		});

		it('groups relationship properties by fieldset', () => {
			sandbox.stub(getRelationships, 'method');

			rawData.getTypes.returns([
				{
					name: 'Type1',
					properties: {
						mainProp: {
							type: 'Word',
							fieldset: 'main',
							relationship: 'HAS',
							label: 'A word relationship'
						},
						secondaryProp: {
							type: 'Document',
							fieldset: 'self',
							relationship: 'HAS',
							label: 'Standalone'
						},
						miscProp: {
							type: 'SomeEnum',
							relationship: 'HAS'
						}
					},
					fieldsets: {
						main: {
							heading: 'Main properties',
							description: 'Fill these out please'
						},
						secondary: {
							heading: 'Secondary properties',
							description: 'Fill these out optionally'
						}
					}
				}
			]);

			const type = getType('Type1', { groupProperties: true });
			expect(type.properties).to.not.exist;
			expect(type.fieldsets.main.properties.mainProp).to.exist;
			expect(type.fieldsets.main.properties.mainProp.label).to.equal(
				'A word relationship'
			);
			expect(type.fieldsets.main.heading).to.equal('Main properties');
			expect(type.fieldsets.main.description).to.equal('Fill these out please');
			expect(type.fieldsets.secondaryProp.properties.secondaryProp).to.exist;
			expect(type.fieldsets.secondaryProp.properties.secondaryProp.label).to.not
				.exist;
			expect(type.fieldsets.secondaryProp.heading).to.equal('Standalone');
			expect(type.fieldsets.secondaryProp.description).to.not.exist;
			expect(type.fieldsets.misc.properties.miscProp).to.exist;
			expect(type.fieldsets.misc.heading).to.equal('Miscellaneous');
			expect(type.fieldsets.misc.description).not.to.exist;
		});
	});
});

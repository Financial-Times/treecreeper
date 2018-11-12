const { getType } = require('../../');
const rawData = require('../../lib/raw-data');
const sinon = require('sinon');
const cache = require('../../lib/cache');

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

	it('it returns read-only properties', async () => {
		rawData.getTypes.returns([
			{
				name: 'Type1',
				properties: {
					primitiveProp: {
						type: 'Word',
						autoPopulated: true
					},
					paragraphProp: {
						type: 'Paragraph',
						autoPopulated: false
					},
					enumProp: {
						type: 'SomeEnum'
					}
				}
			}
		]);

		const type = getType('Type1', { primitiveTypes: 'graphql' });
		expect(type.properties.primitiveProp.autoPopulated).to.eql(true);
		expect(type.properties.paragraphProp.autoPopulated).to.eql(false);
		expect(type.properties.enumProp.autoPopulated).to.not.exist;
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
		expect(type.fieldsets.main.isSingleField).to.not.exist;
		expect(type.fieldsets.secondaryProp.properties.secondaryProp).to.exist;
		expect(
			type.fieldsets.secondaryProp.properties.secondaryProp.label
		).to.equal('Standalone');
		expect(type.fieldsets.secondaryProp.heading).to.equal('Standalone');
		expect(type.fieldsets.secondaryProp.description).to.not.exist;
		expect(type.fieldsets.secondaryProp.isSingleField).to.equal(true);
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
		it('it can exclude relationships', async () => {
			rawData.getTypes.returns([
				{
					name: 'Type1',
					properties: {
						testName: {
							type: 'Type2',
							direction: 'outgoing',
							relationship: 'HAS',
							label: 'test label',
							description: 'test description'
						}
					}
				}
			]);

			const type = getType('Type1', { withRelationships: false });
			expect(type.properties.testName).to.not.exist;
		});

		it('retrieve relationships pointing away from the node', () => {
			rawData.getTypes.returns([
				{
					name: 'Type1',
					properties: {
						testName: {
							type: 'Type2',
							direction: 'outgoing',
							relationship: 'HAS',
							label: 'test label',
							description: 'test description'
						}
					}
				}
			]);
			expect(getType('Type1').properties.testName).to.eql({
				relationship: 'HAS',
				direction: 'outgoing',
				type: 'Type2',
				hasMany: false,
				isRelationship: true,
				isRecursive: false,
				description: 'test description',
				label: 'test label'
			});
		});

		it('retrieve relationships pointing to the node', () => {
			rawData.getTypes.returns([
				{
					name: 'Type2',
					properties: {
						testName: {
							type: 'Type1',
							direction: 'incoming',
							relationship: 'HAS',
							label: 'test label',
							description: 'test description'
						}
					}
				}
			]);
			expect(getType('Type2').properties.testName).to.eql({
				relationship: 'HAS',
				direction: 'incoming',
				type: 'Type1',
				isRelationship: true,
				isRecursive: false,
				hasMany: false,
				description: 'test description',
				label: 'test label'
			});
		});

		it('retrieve multiple relationships with same name', () => {
			rawData.getTypes.returns([
				{
					name: 'Type1',
					properties: {
						testName1: {
							type: 'Type2',
							direction: 'outgoing',
							relationship: 'HAS'
						},
						testName2: {
							type: 'Type3',
							direction: 'incoming',
							relationship: 'HAS'
						}
					}
				}
			]);
			const result = getType('Type1').properties;
			expect(result.testName1.direction).to.equal('outgoing');
			expect(result.testName2.direction).to.equal('incoming');
		});

		it('retrieve two relationships when pointing at self', () => {
			rawData.getTypes.returns([
				{
					name: 'Type1',
					properties: {
						testName1: {
							type: 'Type1',
							direction: 'outgoing',
							relationship: 'HAS'
						},
						testName2: {
							type: 'Type1',
							direction: 'incoming',
							relationship: 'HAS'
						}
					}
				}
			]);
			const result = getType('Type1').properties;
			expect(result.testName1.direction).to.equal('outgoing');
			expect(result.testName2.direction).to.equal('incoming');
		});
		it('define recursive relationships', () => {
			rawData.getTypes.returns([
				{
					name: 'Type1',
					properties: {
						testName: {
							type: 'Type2',
							direction: 'outgoing',
							isRecursive: true,
							relationship: 'HAS',
							label: 'test label',
							description: 'test description'
						}
					}
				}
			]);

			expect(getType('Type1').properties.testName).to.eql({
				type: 'Type2',
				hasMany: false,
				direction: 'outgoing',
				isRecursive: true,
				isRelationship: true,
				relationship: 'HAS',
				description: 'test description',
				label: 'test label'
			});
		});

		it('cardinality', () => {
			rawData.getTypes.returns([
				{
					name: 'Type1',
					properties: {
						many: {
							type: 'Type2',
							hasMany: true,
							direction: 'outgoing',
							relationship: 'HAS'
						},
						singular: {
							type: 'Type2',
							direction: 'incoming',
							relationship: 'HAS'
						}
					}
				}
			]);
			expect(getType('Type1').properties).to.eql({
				many: {
					isRecursive: false,
					isRelationship: true,
					type: 'Type2',
					relationship: 'HAS',
					direction: 'outgoing',
					hasMany: true
				},
				singular: {
					isRecursive: false,
					isRelationship: true,
					type: 'Type2',
					relationship: 'HAS',
					direction: 'incoming',
					hasMany: false
				}
			});
		});

		it('hidden relationships', () => {
			rawData.getTypes.returns([
				{
					name: 'Type1',
					properties: {
						testName: {
							type: 'Type2',
							direction: 'outgoing',
							relationship: 'HAS',
							label: 'test label',
							description: 'test description',
							hidden: true
						}
					}
				}
			]);
			expect(getType('Type1').properties.testName).to.not.exist;
		});

		it('can group relationship properties by fieldset', () => {
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
			expect(type.fieldsets.main.isSingleField).to.not.exist;
			expect(type.fieldsets.secondaryProp.properties.secondaryProp).to.exist;
			expect(
				type.fieldsets.secondaryProp.properties.secondaryProp.label
			).to.equal('Standalone');
			expect(type.fieldsets.secondaryProp.heading).to.equal('Standalone');
			expect(type.fieldsets.secondaryProp.description).to.not.exist;
			expect(type.fieldsets.secondaryProp.isSingleField).to.equal(true);
			expect(type.fieldsets.misc.properties.miscProp).to.exist;
			expect(type.fieldsets.misc.heading).to.equal('Miscellaneous');
			expect(type.fieldsets.misc.description).not.to.exist;
		});
	});
});

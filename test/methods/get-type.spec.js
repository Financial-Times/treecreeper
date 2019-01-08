const { getType } = require('../../');
const rawData = require('../../lib/raw-data');
const cache = require('../../lib/cache');

describe('get-type', () => {
	beforeEach(() => {
		jest.spyOn(rawData, 'getTypes');
		jest.spyOn(rawData, 'getStringPatterns');
	});

	afterEach(() => {
		cache.clear();
		jest.restoreAllMocks();
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
		rawData.getTypes.mockReturnValue([{ name: 'DummyType' }, type1]);
		const type = getType('Type1');
		expect(type.name).toBe('Type1');
		expect(type.description).toBe('I am Type1');
		expect(type.properties).toEqual(type1.properties);
	});

	it('returns a type property to alias the name field', async () => {
		const type1 = {
			name: 'Type1',
			description: 'I am Type1',
		};
		rawData.getTypes.mockReturnValue([{ name: 'DummyType' }, type1]);
		const type = getType('Type1');
		expect(type.name).toBe('Type1');
		expect(type.type).toBe('Type1');
		expect(type.description).toBe('I am Type1');
	});

	it('generates plural name if necessary', async () => {
		rawData.getTypes.mockReturnValue([
			{
				name: 'Type1'
			}
		]);
		const type = getType('Type1');
		expect(type.pluralName).toBe('Type1s');
	});

	it('does not override manually set plural name', async () => {
		rawData.getTypes.mockReturnValue([
			{
				name: 'Type1',
				pluralName: 'Type1ticles'
			}
		]);
		const type = getType('Type1');
		expect(type.pluralName).toBe('Type1ticles');
	});

	it('converts string patterns to regex based function', async () => {
		rawData.getTypes.mockReturnValue([
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
		rawData.getStringPatterns.mockReturnValue({
			CODE: '^ab$'
		});
		const type = getType('Type1');
		const validator = type.properties.code.validator;
		expect(validator.test('ay')).toBe(false);
		expect(validator.test('zb')).toBe(false);
		expect(validator.test('ab')).toBe(true);
	});

	it('converts string patterns with regex flags to regex based function', async () => {
		rawData.getTypes.mockReturnValue([
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
		rawData.getStringPatterns.mockReturnValue({
			CODE2: {
				pattern: '^ab$',
				flags: 'i'
			}
		});
		const type = getType('Type1');
		const validator = type.properties.code.validator;
		expect(validator.test('AB')).toBe(true);
	});

	it('it returns read-only properties', async () => {
		rawData.getTypes.mockReturnValue([
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
		expect(type.properties.primitiveProp.autoPopulated).toBe(true);
		expect(type.properties.paragraphProp.autoPopulated).toBe(false);
		expect(type.properties.enumProp.autoPopulated).toBeFalsy();
	});

	it('it maps types to graphql properties', async () => {
		rawData.getTypes.mockReturnValue([
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
		expect(type.properties.primitiveProp).toEqual({ type: 'String' });
		expect(type.properties.documentProp).toBeFalsy();
		expect(type.properties.enumProp).toEqual({ type: 'SomeEnum' });
	});

	it('groups properties by fieldset', () => {
		rawData.getTypes.mockReturnValue([
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
		expect(type.properties).toBeFalsy();
		expect(type.fieldsets.main.properties.mainProp).toBeDefined();
		expect(type.fieldsets.main.properties.mainProp.label).toBe('A word');
		expect(type.fieldsets.main.heading).toBe('Main properties');
		expect(type.fieldsets.main.description).toBe('Fill these out please');
		expect(type.fieldsets.main.isSingleField).toBeFalsy();
		expect(type.fieldsets.secondaryProp.properties.secondaryProp).toBeDefined();
		expect(type.fieldsets.secondaryProp.properties.secondaryProp.label).toBe(
			'Standalone'
		);
		expect(type.fieldsets.secondaryProp.heading).toBe('Standalone');
		expect(type.fieldsets.secondaryProp.description).toBeFalsy();
		expect(type.fieldsets.secondaryProp.isSingleField).toBe(true);
		expect(type.fieldsets.misc.properties.miscProp).toBeDefined();
		expect(type.fieldsets.misc.heading).toBe('Miscellaneous');
		expect(type.fieldsets.misc.description).not.toBeDefined();
	});

	it('not have empty fieldsets', () => {
		rawData.getTypes.mockReturnValue([
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
		expect(type.properties).toBeFalsy();
		expect(type.fieldsets.secondary).toBeFalsy();
		expect(type.fieldsets.misc).toBeFalsy();
	});

	it('handle lack of custom fieldsets well when grouping', () => {
		rawData.getTypes.mockReturnValue([
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
		expect(type.properties).toBeFalsy();
		expect(type.fieldsets.misc.properties.mainProp).toBeDefined();
		expect(type.fieldsets.misc.properties.secondaryProp).toBeDefined();
		expect(type.fieldsets.misc.properties.miscProp).toBeDefined();
		expect(type.fieldsets.misc.heading).toBe('General');
	});

	describe('relationships', () => {
		it('it can exclude relationships', async () => {
			rawData.getTypes.mockReturnValue([
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
			expect(type.properties.testName).toBeFalsy();
		});

		it('retrieve relationships pointing away from the node', () => {
			rawData.getTypes.mockReturnValue([
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
			expect(getType('Type1').properties.testName).toEqual({
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
			rawData.getTypes.mockReturnValue([
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
			expect(getType('Type2').properties.testName).toEqual({
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
			rawData.getTypes.mockReturnValue([
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
			expect(result.testName1.direction).toBe('outgoing');
			expect(result.testName2.direction).toBe('incoming');
		});

		it('retrieve two relationships when pointing at self', () => {
			rawData.getTypes.mockReturnValue([
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
			expect(result.testName1.direction).toBe('outgoing');
			expect(result.testName2.direction).toBe('incoming');
		});
		it('define recursive relationships', () => {
			rawData.getTypes.mockReturnValue([
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

			expect(getType('Type1').properties.testName).toEqual({
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
			rawData.getTypes.mockReturnValue([
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
			expect(getType('Type1').properties).toEqual({
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
			rawData.getTypes.mockReturnValue([
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
			expect(getType('Type1').properties.testName).toBeFalsy();
		});

		it('can group relationship properties by fieldset', () => {
			rawData.getTypes.mockReturnValue([
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
			expect(type.properties).toBeFalsy();
			expect(type.fieldsets.main.properties.mainProp).toBeDefined();
			expect(type.fieldsets.main.properties.mainProp.label).toBe(
				'A word relationship'
			);
			expect(type.fieldsets.main.heading).toBe('Main properties');
			expect(type.fieldsets.main.description).toBe('Fill these out please');
			expect(type.fieldsets.main.isSingleField).toBeFalsy();
			expect(
				type.fieldsets.secondaryProp.properties.secondaryProp
			).toBeDefined();
			expect(type.fieldsets.secondaryProp.properties.secondaryProp.label).toBe(
				'Standalone'
			);
			expect(type.fieldsets.secondaryProp.heading).toBe('Standalone');
			expect(type.fieldsets.secondaryProp.description).toBeFalsy();
			expect(type.fieldsets.secondaryProp.isSingleField).toBe(true);
			expect(type.fieldsets.misc.properties.miscProp).toBeDefined();
			expect(type.fieldsets.misc.heading).toBe('Miscellaneous');
			expect(type.fieldsets.misc.description).not.toBeDefined();
		});
	});
});

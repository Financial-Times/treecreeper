const metaProperties = require('../../lib/meta-properties');
const { SDK } = require('../../sdk');

const typeFromRawData = (
	typeData,
	{ stringPatterns = {}, primitiveTypes = {}, options } = {},
) =>
	new SDK({
		schemaData: {
			schema: {
				types: [{ name: 'DummyType' }].concat(typeData),
				stringPatterns,
				primitiveTypes,
			},
		},
	}).getType('Type1', options);

describe('get-type', () => {
	describe('returns all properties', () => {
		const type1 = {
			name: 'Type1',
			description: 'I am Type1',
			properties: {
				property1: {
					type: 'String',
				},
				property2: {
					type: 'Boolean',
				},
			},
		};
		let compiledType;

		beforeAll(() => {
			compiledType = typeFromRawData(type1, {
				options: { includeMetaFields: true },
			});
		});

		it('returns name and description and properties of type (excludes meta data)', () => {
			expect(compiledType.name).toBe('Type1');
			expect(compiledType.description).toBe('I am Type1');
			expect(compiledType.properties).toHaveProperty('property1');
			expect(compiledType.properties.property1).toMatchObject({
				type: 'String',
			});
			expect(compiledType.properties).toHaveProperty('property2');
			expect(compiledType.properties.property2).toMatchObject({
				type: 'Boolean',
			});
		});

		metaProperties.forEach(property => {
			const propertyName = property.name;

			it(`returns auto generated meta property ${propertyName}`, () => {
				const propertyExpectedResult = metaProperties.find(
					prop => prop.name === propertyName,
				);
				const propertyActualResult =
					compiledType.properties[property.name];
				expect(propertyActualResult.type).toBe(
					propertyExpectedResult.type,
				);
				expect(propertyActualResult.description).toBe(
					propertyExpectedResult.description,
				);
				expect(propertyActualResult.label).toBe(
					propertyExpectedResult.label,
				);
				expect(propertyActualResult.fieldset).toBe('meta');
			});
		});
	});

	it('returns meta properties when no other properties are set', () => {
		const metaPropertyName = metaProperties.map(property => property.name);
		const type = typeFromRawData(
			{
				name: 'Type1',
				description: 'I am Type1',
			},
			{ options: { includeMetaFields: true } },
		);

		expect(type).toHaveProperty('properties');
		metaPropertyName.forEach(propertyName => {
			expect(type.properties).toHaveProperty(propertyName);
		});
	});

	it('can exclude meta properties', () => {
		const metaPropertyName = metaProperties.map(property => property.name);
		const type = typeFromRawData(
			{
				name: 'Type1',
				description: 'I am Type1',
				properties: {
					property1: {
						type: 'String',
					},
				},
			},
			{ options: { includeMetaFields: false } },
		);

		expect(type).toHaveProperty('properties');
		metaPropertyName.forEach(propertyName => {
			expect(type.properties).not.toHaveProperty(propertyName);
		});
	});

	it('returns a type property to alias the name field', async () => {
		const type = typeFromRawData({
			name: 'Type1',
			description: 'I am Type1',
		});
		expect(type.name).toBe('Type1');
		expect(type.type).toBe('Type1');
		expect(type.description).toBe('I am Type1');
	});

	it('generates plural name if necessary', async () => {
		const type = typeFromRawData({
			name: 'Type1',
		});
		expect(type.pluralName).toBe('Type1s');
	});

	it('does not override manually set plural name', async () => {
		const type = typeFromRawData({
			name: 'Type1',
			pluralName: 'Type1ticles',
		});
		expect(type.pluralName).toBe('Type1ticles');
	});

	it('forces `code` property to have constraints', () => {
		const type = typeFromRawData({
			name: 'Type1',
			properties: {
				code: {},
			},
		});
		expect(type.properties.code).toMatchObject({
			type: 'Code',
			required: true,
			unique: true,
			canIdentify: true,
			useInSummary: true,
		});
	});

	it('converts string patterns to regex based function', async () => {
		const type = typeFromRawData(
			{
				name: 'Type1',
				properties: {
					code: {
						type: 'String',
						pattern: 'CODE',
					},
				},
			},
			{
				stringPatterns: {
					CODE: '^ab$',
				},
			},
		);
		const { validator } = type.properties.code;
		expect(validator.test('ay')).toBe(false);
		expect(validator.test('zb')).toBe(false);
		expect(validator.test('ab')).toBe(true);
	});

	it('converts string patterns with regex flags to regex based function', async () => {
		const type = typeFromRawData(
			{
				name: 'Type1',
				properties: {
					code: {
						type: 'String',
						pattern: 'CODE2',
					},
				},
			},
			{
				stringPatterns: {
					CODE2: {
						pattern: '^ab$',
						flags: 'i',
					},
				},
			},
		);
		const { validator } = type.properties.code;
		expect(validator.test('AB')).toBe(true);
	});

	it('includes synthetic properties by default', () => {
		const type = typeFromRawData({
			name: 'Type1',
			properties: {
				syntheticProp: {
					type: 'Type1',
					cypher: 'MATCH blah',
				},
			},
		});

		expect(type.properties).toHaveProperty('syntheticProp');
	});

	it('can exclude synthetic properties', () => {
		const type = typeFromRawData(
			{
				name: 'Type1',
				properties: {
					syntheticProp: {
						type: 'Type1',
						cypher: 'MATCH blah',
					},
				},
			},
			{ options: { includeSyntheticFields: false } },
		);

		expect(type.properties).not.toHaveProperty('syntheticProp');
	});

	it('groups properties by fieldset', () => {
		const type = typeFromRawData(
			{
				name: 'Type1',
				properties: {
					mainProp: {
						type: 'Word',
						fieldset: 'main',
						label: 'A word',
					},
					secondaryProp: {
						type: 'Document',
						fieldset: 'self',
						label: 'Standalone',
					},
					miscProp: {
						type: 'SomeEnum',
					},
				},
				fieldsets: {
					main: {
						heading: 'Main properties',
						description: 'Fill these out please',
					},
					secondary: {
						heading: 'Secondary properties',
						description: 'Fill these out optionally',
					},
				},
			},
			{ options: { groupProperties: true } },
		);

		expect(type.properties).toBeFalsy();
		expect(type.fieldsets.main.properties.mainProp).toBeDefined();
		expect(type.fieldsets.main.properties.mainProp.label).toBe('A word');
		expect(type.fieldsets.main.heading).toBe('Main properties');
		expect(type.fieldsets.main.description).toBe('Fill these out please');
		expect(type.fieldsets.main.isSingleField).toBeFalsy();
		expect(
			type.fieldsets.secondaryProp.properties.secondaryProp,
		).toBeDefined();
		expect(
			type.fieldsets.secondaryProp.properties.secondaryProp.label,
		).toBe('Standalone');
		expect(type.fieldsets.secondaryProp.heading).toBe('Standalone');
		expect(type.fieldsets.secondaryProp.description).toBeFalsy();
		expect(type.fieldsets.secondaryProp.isSingleField).toBe(true);
		expect(type.fieldsets.misc.properties.miscProp).toBeDefined();
		expect(type.fieldsets.misc.heading).toBe('Miscellaneous');
		expect(type.fieldsets.misc.description).not.toBeDefined();
	});

	it('not have empty fieldsets', () => {
		const type = typeFromRawData(
			{
				name: 'Type1',
				properties: {
					mainProp: {
						type: 'Word',
						fieldset: 'main',
					},
				},
				fieldsets: {
					main: {
						heading: 'Main properties',
						description: 'Fill these out please',
					},
					secondary: {
						heading: 'Secondary properties',
						description: 'Fill these out optionally',
					},
				},
			},
			{ options: { groupProperties: true } },
		);

		expect(type.properties).toBeFalsy();
		expect(type.fieldsets.secondary).toBeFalsy();
		expect(type.fieldsets.misc).toBeFalsy();
	});

	it('handle lack of custom fieldsets well when grouping', () => {
		const type = typeFromRawData(
			{
				name: 'Type1',
				properties: {
					mainProp: {
						type: 'Word',
					},
					secondaryProp: {
						type: 'Document',
						label: 'Standalone',
					},
					miscProp: {
						type: 'SomeEnum',
					},
				},
			},
			{ options: { groupProperties: true } },
		);

		expect(type.properties).toBeFalsy();
		expect(type.fieldsets.misc.properties.mainProp).toBeDefined();
		expect(type.fieldsets.misc.properties.secondaryProp).toBeDefined();
		expect(type.fieldsets.misc.properties.miscProp).toBeDefined();
		expect(type.fieldsets.misc.heading).toBe('General');
	});

	describe('minimum viable record', () => {
		it('creates fieldset for minimum viable record fields', () => {
			const type = typeFromRawData(
				{
					name: 'Type1',
					minimumViableRecord: ['secondaryProp', 'miscProp'],
					properties: {
						mainProp: {
							type: 'Word',
							fieldset: 'main',
						},
						secondaryProp: {
							type: 'Document',
							label: 'Standalone',
							fieldset: 'main',
						},
						miscProp: {
							type: 'SomeEnum',
						},
					},
					fieldsets: {
						main: {
							heading: 'Main properties',
							description: 'Fill these out please',
						},
						secondary: {
							heading: 'Secondary properties',
							description: 'Fill these out optionally',
						},
					},
				},
				{
					options: {
						groupProperties: true,
						useMinimumViableRecord: true,
					},
				},
			);
			expect(
				type.fieldsets.minimumViableRecord.properties.secondaryProp,
			).toBeDefined();
			expect(
				type.fieldsets.minimumViableRecord.properties.miscProp,
			).toBeDefined();
			expect(type.fieldsets.misc).not.toBeDefined();
			expect(
				type.fieldsets.main.properties.secondaryProp,
			).not.toBeDefined();

			expect(Object.keys(type.fieldsets)[0]).toEqual(
				'minimumViableRecord',
			);
			expect(type.fieldsets.minimumViableRecord.heading).toEqual(
				'Minimum viable record',
			);
		});

		it('skips creating minimum viable record fieldset if option not passed in', () => {
			const type = typeFromRawData(
				{
					name: 'Type1',
					minimumViableRecord: ['secondaryProp', 'miscProp'],
					properties: {
						mainProp: {
							type: 'Word',
							fieldset: 'main',
						},
						secondaryProp: {
							type: 'Document',
							label: 'Standalone',
							fieldset: 'main',
						},
						miscProp: {
							type: 'SomeEnum',
						},
					},
					fieldsets: {
						main: {
							heading: 'Main properties',
							description: 'Fill these out please',
						},
						secondary: {
							heading: 'Secondary properties',
							description: 'Fill these out optionally',
						},
					},
				},
				{ options: { groupProperties: true } },
			);
			expect(type.fieldsets.minimumViableRecord).not.toBeDefined();
		});

		it('skips creating minimum viable record fieldset if no list of fields defined in schema', () => {
			const type = typeFromRawData(
				{
					name: 'Type1',
					properties: {
						mainProp: {
							type: 'Word',
							fieldset: 'main',
						},
						secondaryProp: {
							type: 'Document',
							label: 'Standalone',
							fieldset: 'main',
						},
						miscProp: {
							type: 'SomeEnum',
						},
					},
					fieldsets: {
						main: {
							heading: 'Main properties',
							description: 'Fill these out please',
						},
						secondary: {
							heading: 'Secondary properties',
							description: 'Fill these out optionally',
						},
					},
				},
				{
					options: {
						groupProperties: true,
						useMinimumViableRecord: true,
					},
				},
			);
			expect(type.fieldsets.minimumViableRecord).not.toBeDefined();
		});
	});

	describe('misc heading of GENERAL for fieldset', () => {
		it('is returned when includeMetaFields is TRUE', () => {
			const type = typeFromRawData(
				{
					name: 'Type1',
					properties: {
						miscProp: {
							type: 'SomeEnum',
						},
					},
				},
				{ options: { groupProperties: true } },
			);
			expect(type.fieldsets.misc.heading).toBe('General');
		});

		it('is returned when includeMetaFields is FALSE', () => {
			const type = typeFromRawData(
				{
					name: 'Type1',
					properties: {
						miscProp: {
							type: 'SomeEnum',
						},
					},
				},
				{
					options: {
						includeMetaFields: false,
						groupProperties: true,
					},
				},
			);
			expect(type.fieldsets.misc.heading).toBe('General');
		});
	});

	describe('misc heading of MISCELLANEOUS for fieldset', () => {
		const typeData = {
			name: 'Type1',
			properties: {
				mainProp: {
					type: 'Word',
					fieldset: 'main',
					label: 'A word relationship',
				},
				miscProp: {
					type: 'SomeEnum',
				},
			},
			fieldsets: {
				main: {
					heading: 'Main properties',
					description: 'Fill these out please',
				},
			},
		};

		it('is returned when includeMetaFields is TRUE', () => {
			const type = typeFromRawData(typeData, {
				options: { groupProperties: true },
			});
			expect(type.fieldsets.misc.heading).toBe('Miscellaneous');
		});

		it('is returned when includeMetaFields is FALSE', () => {
			const type = typeFromRawData(typeData, {
				options: { includeMetaFields: false, groupProperties: true },
			});
			expect(type.fieldsets.misc.heading).toBe('Miscellaneous');
		});
	});

	describe('can group auto generated meta properties by fieldset', () => {
		let type;

		beforeEach(() => {
			type = typeFromRawData(
				{
					name: 'Type1',
				},
				{ options: { groupProperties: true, includeMetaFields: true } },
			);
		});

		it('returns meta fieldset', () => {
			expect(type.fieldsets.meta.heading).toBe('Metadata');
			expect(type.fieldsets.meta.properties).toBeDefined();
		});

		metaProperties.forEach(property => {
			const propertyName = property.name;
			it(`returns meta fieldset property ${property.name}`, () => {
				const fieldsetProperty =
					type.fieldsets.meta.properties[propertyName];
				expect(fieldsetProperty.type).toEqual(property.type);
				expect(fieldsetProperty.description).toEqual(
					property.description,
				);
				expect(fieldsetProperty.label).toEqual(property.label);
			});
		});
	});

	it('does not create meta data fieldset when includeMetaFields is set to FALSE', () => {
		const type = typeFromRawData(
			{
				name: 'Type1',
			},
			{
				options: {
					groupProperties: true,
					includeMetaFields: false,
				},
			},
		);
		expect(type.fieldsets).toEqual({});
	});

	describe('relationships', () => {
		it('it can exclude relationships', async () => {
			const type = typeFromRawData(
				[
					{
						name: 'Type1',
						properties: {
							testName: {
								type: 'Type2',
								direction: 'outgoing',
								relationship: 'HAS',
								label: 'test label',
								description: 'test description',
							},
						},
					},
					{
						name: 'Type2',
						properties: {
							testNameInverse: {
								type: 'Type1',
								direction: 'incoming',
								relationship: 'HAS',
							},
						},
					},
				],
				{ options: { withRelationships: false } },
			);

			expect(type.properties.testName).toBeFalsy();
		});

		it('retrieve relationships pointing away from the node', () => {
			const type = typeFromRawData([
				{
					name: 'Type1',
					properties: {
						testName: {
							type: 'Type2',
							direction: 'outgoing',
							relationship: 'HAS',
							label: 'test label',
							description: 'test description',
						},
					},
				},
				{
					name: 'Type2',
					properties: {
						testNameInverse: {
							type: 'Type1',
							direction: 'incoming',
							relationship: 'HAS',
						},
					},
				},
			]);
			expect(type.properties.testName).toEqual({
				relationship: 'HAS',
				direction: 'outgoing',
				type: 'Type2',
				otherNodeName: 'Type2',
				hasMany: false,
				isRelationship: true,
				showInactive: true,
				writeInactive: false,
				description: 'test description',
				label: 'test label',
				properties: {},
			});
		});

		it('retrieve relationships pointing to the node', () => {
			const type = typeFromRawData([
				{
					name: 'Type1',
					properties: {
						testName: {
							type: 'Type2',
							direction: 'incoming',
							relationship: 'HAS',
							label: 'test label',
							description: 'test description',
						},
					},
				},
				{
					name: 'Type2',
					properties: {
						testNameInverse: {
							type: 'Type1',
							direction: 'outgoing',
							relationship: 'HAS',
						},
					},
				},
			]);
			expect(type.properties.testName).toEqual({
				relationship: 'HAS',
				direction: 'incoming',
				type: 'Type2',
				otherNodeName: 'Type2',
				isRelationship: true,
				showInactive: true,
				writeInactive: false,
				hasMany: false,
				description: 'test description',
				label: 'test label',
				properties: {},
			});
		});

		it('retrieve multiple relationships with same name', () => {
			const type = typeFromRawData([
				{
					name: 'Type1',
					properties: {
						testName1: {
							type: 'Type2',
							direction: 'outgoing',
							relationship: 'HAS',
						},
						testName2: {
							type: 'Type3',
							direction: 'incoming',
							relationship: 'HAS',
						},
					},
				},
				{
					name: 'Type2',
					properties: {
						testName1: {
							type: 'Type1',
							direction: 'incoming',
							relationship: 'HAS',
						},
					},
				},
				{
					name: 'Type3',
					properties: {
						testName1: {
							type: 'Type1',
							direction: 'outgoing',
							relationship: 'HAS',
						},
					},
				},
			]);
			expect(type.properties.testName1.direction).toBe('outgoing');
			expect(type.properties.testName2.direction).toBe('incoming');
		});

		it('retrieve two relationships when pointing at self', () => {
			const type = typeFromRawData({
				name: 'Type1',
				properties: {
					testName1: {
						type: 'Type1',
						direction: 'outgoing',
						relationship: 'HAS',
					},
					testName2: {
						type: 'Type1',
						direction: 'incoming',
						relationship: 'HAS',
					},
				},
			});
			expect(type.properties.testName1.direction).toBe('outgoing');
			expect(type.properties.testName2.direction).toBe('incoming');
		});

		it('define relationships with cypher query', () => {
			const type = typeFromRawData({
				name: 'Type1',
				properties: {
					testName: {
						type: 'Type2',
						cypher:
							'MATCH (this)-[]->(related) RETURN DISTINCT related',
						label: 'test label',
						description: 'test description',
					},
				},
			});

			expect(type.properties.testName).toMatchObject({
				type: 'Type2',
				otherNodeName: 'Type2',
				hasMany: false,
				cypher: 'MATCH (this)-[]->(related) RETURN DISTINCT related',
				isRelationship: true,
				description: 'test description',
				label: 'test label',
			});
		});

		it('cardinality', () => {
			const type = typeFromRawData([
				{
					name: 'Type1',
					properties: {
						many: {
							type: 'Type2',
							hasMany: true,
							direction: 'outgoing',
							relationship: 'HAS',
						},
						singular: {
							type: 'Type2',
							direction: 'incoming',
							relationship: 'HAS',
						},
						cypherMany: {
							type: 'Type2',
							hasMany: true,
							cypher:
								'MATCH (this)-[]->(related) RETURN DISTINCT related',
						},
					},
				},
				{
					name: 'Type2',
					properties: {
						testName: {
							type: 'Type1',
							direction: 'incoming',
							relationship: 'HAS',
						},
						testName2: {
							type: 'Type1',
							direction: 'outgoing',
							relationship: 'HAS',
						},
					},
				},
			]);
			expect(type.properties.many).toEqual({
				isRelationship: true,
				showInactive: true,
				writeInactive: false,
				type: 'Type2',
				otherNodeName: 'Type2',
				relationship: 'HAS',
				direction: 'outgoing',
				hasMany: true,
				properties: {},
			});
			expect(type.properties.cypherMany).toEqual({
				isRelationship: true,
				type: 'Type2',
				otherNodeName: 'Type2',
				cypher: 'MATCH (this)-[]->(related) RETURN DISTINCT related',
				hasMany: true,
			});
			expect(type.properties.singular).toEqual({
				isRelationship: true,
				showInactive: true,
				writeInactive: false,
				type: 'Type2',
				otherNodeName: 'Type2',
				relationship: 'HAS',
				direction: 'incoming',
				hasMany: false,
				properties: {},
			});
		});

		it('relationships can hide inactive records', () => {
			const type = typeFromRawData([
				{
					name: 'Type1',
					properties: {
						testName: {
							type: 'Type2',
							direction: 'outgoing',
							relationship: 'HAS',
							label: 'test label',
							showInactive: false,
							description: 'test description',
						},
					},
				},
				{
					name: 'Type2',
					properties: {
						testName: {
							type: 'Type1',
							direction: 'incoming',
							relationship: 'HAS',
						},
					},
				},
			]);
			expect(type.properties.testName.showInactive).toBe(false);
		});

		it('relationships can allow adding inactive records', () => {
			const type = typeFromRawData([
				{
					name: 'Type1',
					properties: {
						testName: {
							type: 'Type2',
							direction: 'outgoing',
							relationship: 'HAS',
							label: 'test label',
							writeInactive: true,
							description: 'test description',
						},
					},
				},
				{
					name: 'Type2',
					properties: {
						testName: {
							type: 'Type1',
							direction: 'incoming',
							relationship: 'HAS',
						},
					},
				},
			]);
			expect(type.properties.testName.writeInactive).toBe(true);
		});

		it('hidden relationships', () => {
			const type = typeFromRawData([
				{
					name: 'Type1',
					properties: {
						testName: {
							type: 'Type2',
							direction: 'outgoing',
							relationship: 'HAS',
							label: 'test label',
							description: 'test description',
							hidden: true,
						},
					},
				},
				{
					name: 'Type2',
					properties: {
						testName: {
							type: 'Type1',
							direction: 'incoming',
							relationship: 'HAS',
						},
					},
				},
			]);
			expect(type.properties.testName).toBeFalsy();
		});

		it('rich relationships', () => {
			const sdk = new SDK({
				schemaData: {
					schema: {
						types: [
							{
								name: 'Type1',
								properties: {
									testNameOutgoing: {
										type: 'Join',
									},
								},
							},
							{
								name: 'Type2',
								properties: {
									testNameIncoming: {
										type: 'Join',
									},
								},
							},
						],
						stringPatterns: {},
						relationshipTypes: [
							{
								name: 'Join',
								from: {
									type: 'Type1',
									hasMany: false,
								},
								to: {
									type: 'Type2',
									hasMany: true,
								},
								relationship: 'HAS',
								properties: {
									testProp: {
										type: Boolean,
									},
								},
							},
						],
					},
				},
			});

			expect(sdk.getType('Type1').properties.testNameOutgoing).toEqual({
				type: 'Type2',
				otherNodeName: 'Type2',
				properties: {
					testProp: {
						type: Boolean,
					},
				},
				relationship: 'HAS',
				direction: 'outgoing',
				hasMany: true,
				showInactive: true,
				writeInactive: false,
				isRelationship: true,
			});
			expect(sdk.getType('Type2').properties.testNameIncoming).toEqual({
				type: 'Type1',
				otherNodeName: 'Type1',
				properties: {
					testProp: {
						type: Boolean,
					},
				},
				relationship: 'HAS',
				direction: 'incoming',
				hasMany: false,
				showInactive: true,
				writeInactive: false,
				isRelationship: true,
			});
		});

		it('can group relationship properties by fieldset', () => {
			const type = typeFromRawData(
				[
					{
						name: 'Type1',
						properties: {
							mainProp: {
								type: 'Word',
								fieldset: 'main',
								label: 'A word relationship',
							},
							secondaryProp: {
								type: 'Type2',
								fieldset: 'self',
								relationship: 'HAS',
								direction: 'outgoing',
								label: 'Standalone',
							},
							miscProp: {
								type: 'SomeEnum',
							},
						},
						fieldsets: {
							main: {
								heading: 'Main properties',
								description: 'Fill these out please',
							},
							secondary: {
								heading: 'Secondary properties',
								description: 'Fill these out optionally',
							},
						},
					},
					{
						name: 'Type2',
						properties: {
							secondaryProp: {
								type: 'Type1',
								relationship: 'HAS',
								direction: 'incoming',
							},
						},
					},
				],
				{ options: { groupProperties: true } },
			);

			expect(type.properties).toBeFalsy();
			expect(type.fieldsets.main.properties.mainProp).toBeDefined();
			expect(type.fieldsets.main.properties.mainProp.label).toBe(
				'A word relationship',
			);
			expect(type.fieldsets.main.heading).toBe('Main properties');
			expect(type.fieldsets.main.description).toBe(
				'Fill these out please',
			);
			expect(type.fieldsets.main.isSingleField).toBeFalsy();
			expect(
				type.fieldsets.secondaryProp.properties.secondaryProp,
			).toBeDefined();
			expect(
				type.fieldsets.secondaryProp.properties.secondaryProp.label,
			).toBe('Standalone');
			expect(type.fieldsets.secondaryProp.heading).toBe('Standalone');
			expect(type.fieldsets.secondaryProp.description).toBeFalsy();
			expect(type.fieldsets.secondaryProp.isSingleField).toBe(true);
			expect(type.fieldsets.misc.properties.miscProp).toBeDefined();
			expect(type.fieldsets.misc.heading).toBe('Miscellaneous');
			expect(type.fieldsets.misc.description).not.toBeDefined();
		});
	});
});

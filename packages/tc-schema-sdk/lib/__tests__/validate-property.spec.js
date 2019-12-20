const { SDK } = require('../../sdk');
const readYaml = require('../read-yaml');

const getValidator = (type, { enums, relationshipTypes } = {}) => {
	const sdk = new SDK({
		schemaData: {
			schema: {
				types: Array.isArray(type) ? type : [type],
				enums,
				stringPatterns: {
					NO_Z: '^[^z]+$',
					LOWERCASE: '^[a-z]+$',
					MAX_LENGTH_4: '^.{2,4}$',
				},
				primitiveTypes: readYaml.file(
					process.env.TREECREEPER_SCHEMA_DIRECTORY,
					'primitive-types.yaml',
				),
				relationshipTypes,
			},
		},
	});
	return sdk.validators.validateProperty;
};

describe('validateProperty', () => {
	it('not accept if not in schema', () => {
		expect(() =>
			getValidator({
				name: 'Thing',
				properties: {
					prop: {
						type: 'Boolean',
					},
				},
			})('Thing', 'prop1', true),
		).toThrow(/Invalid property `prop1` on type `Thing`/);
	});

	describe('validating strings', () => {
		const primitivesSdk = new SDK({
			schemaData: {
				schema: {
					primitiveTypes: readYaml.file(
						process.env.TREECREEPER_SCHEMA_DIRECTORY,
						'primitive-types.yaml',
					),
				},
			},
		});
		Object.entries(
			primitivesSdk.getPrimitiveTypes({ output: 'graphql' }),
		).forEach(([bizOpsType, graphqlType]) => {
			let validateProperty;
			if (graphqlType === 'String') {
				beforeEach(() => {
					validateProperty = getValidator({
						name: 'Thing',
						properties: {
							prop: {
								type: bizOpsType,
								pattern: 'NO_Z',
							},
							shortprop: {
								type: bizOpsType,
								pattern: 'MAX_LENGTH_4',
							},
						},
					});
				});
				it('accept strings', () => {
					expect(() =>
						validateProperty('Thing', 'prop', 'I am Tracy Beaker'),
					).not.toThrow();
				});
				it('not accept booleans', () => {
					expect(() =>
						validateProperty('Thing', 'prop', true),
					).toThrow(/Must be a string/);
					expect(() =>
						validateProperty('Thing', 'prop', false),
					).toThrow(/Must be a string/);
				});
				it('not accept floats', () => {
					expect(() =>
						validateProperty('Thing', 'prop', 1.34),
					).toThrow(/Must be a string/);
				});
				it('not accept integers', () => {
					expect(() =>
						validateProperty('Thing', 'prop', 134),
					).toThrow(/Must be a string/);
				});
				it('apply string patterns', () => {
					expect(() =>
						validateProperty('Thing', 'prop', 'I am zebbedee'),
					).toThrow('Must match pattern /^[^z]+$/');
					expect(() =>
						validateProperty('Thing', 'shortprop', '13 characters'),
					).toThrow(
						'Must match pattern /^.{2,4}$/ and be no more than 4 characters',
					);
				});
			}
		});
	});
	describe('validating booleans', () => {
		let validateProperty;
		beforeEach(() => {
			validateProperty = getValidator({
				name: 'Thing',
				properties: {
					prop: {
						type: 'Boolean',
					},
				},
			});
		});

		it('not accept strings', () => {
			expect(() =>
				validateProperty('Thing', 'prop', 'I am Tracy Beaker'),
			).toThrow(/Must be a Boolean/);
		});
		it('accept booleans', () => {
			expect(() => validateProperty('Thing', 'prop', true)).not.toThrow();
			expect(() =>
				validateProperty('Thing', 'prop', false),
			).not.toThrow();
		});
		it('not accept floats', () => {
			expect(() => validateProperty('Thing', 'prop', 1.34)).toThrow(
				/Must be a Boolean/,
			);
		});
		it('not accept integers', () => {
			expect(() => validateProperty('Thing', 'prop', 134)).toThrow(
				/Must be a Boolean/,
			);
		});
	});
	describe('validating floats', () => {
		let validateProperty;
		beforeEach(() => {
			validateProperty = getValidator({
				name: 'Thing',
				properties: {
					prop: {
						type: 'Float',
					},
				},
			});
		});

		it('not accept strings', () => {
			expect(() =>
				validateProperty('Thing', 'prop', 'I am Tracy Beaker'),
			).toThrow(/Must be a finite floating point number/);
		});
		it('not accept booleans', () => {
			expect(() => validateProperty('Thing', 'prop', true)).toThrow(
				/Must be a finite floating point number/,
			);
			expect(() => validateProperty('Thing', 'prop', false)).toThrow(
				/Must be a finite floating point number/,
			);
		});
		it('accept floats', () => {
			expect(() => validateProperty('Thing', 'prop', 1.34)).not.toThrow();
		});
		it('accept integers', () => {
			expect(() => validateProperty('Thing', 'prop', 134)).not.toThrow();
		});
	});

	describe('validating integers', () => {
		let validateProperty;
		beforeEach(() => {
			validateProperty = getValidator({
				name: 'Thing',
				properties: {
					prop: {
						type: 'Int',
					},
				},
			});
		});

		it('not accept strings', () => {
			expect(() =>
				validateProperty('Thing', 'prop', 'I am Tracy Beaker'),
			).toThrow(/Must be a finite integer/);
		});
		it('not accept booleans', () => {
			expect(() => validateProperty('Thing', 'prop', true)).toThrow(
				/Must be a finite integer/,
			);
			expect(() => validateProperty('Thing', 'prop', false)).toThrow(
				/Must be a finite integer/,
			);
		});
		it('not accept floats', () => {
			expect(() => validateProperty('Thing', 'prop', 1.34)).toThrow(
				/Must be a finite integer/,
			);
		});
		it('accept integers', () => {
			expect(() => validateProperty('Thing', 'prop', 134)).not.toThrow();
		});
	});
	describe('validating enums', () => {
		let validateProperty;
		beforeEach(() => {
			const enums = {
				MyEnum: {
					options: { bear: 'grylls', ray: 'winstone' },
				},
			};
			validateProperty = getValidator(
				{
					name: 'Thing',
					properties: {
						prop: {
							type: 'MyEnum',
						},
					},
				},
				{ enums },
			);
		});
		it('accept value defined in a mapping enum', () => {
			expect(() =>
				validateProperty('Thing', 'prop', 'bear'),
			).not.toThrow();
		});

		it('not accept value not defined in a mapping enum', () => {
			expect(() => validateProperty('Thing', 'prop', 'ban')).toThrow(
				/Must be a valid enum/,
			);
		});
	});

	describe('validating relationships', () => {
		let validateProperty;
		beforeEach(() => {
			validateProperty = getValidator([
				{
					name: 'StartType',
					properties: {
						testRelationship: {
							type: 'EndType',
							direction: 'outgoing',
							relationship: 'HAS',
							hasMany: false,
						},
						testCypherRelationship: {
							type: 'EndType',
							cypher: 'ha',
						},
					},
				},
				{
					name: 'EndType',
					properties: {
						code: { pattern: 'LOWERCASE', type: 'String' },
						inverseTestRelationship: {
							type: 'StartType',
							direction: 'incoming',
							relationship: 'HAS',
							hasMany: false,
						},
					},
				},
			]);
		});

		it('reject when related node code is invalid', () => {
			expect(() =>
				validateProperty('StartType', 'testRelationship', 'UPPERCASE'),
			).toThrow(
				'Invalid value `UPPERCASE` for property `code` on type `EndType`: Must match pattern /^[a-z]+$/',
			);
		});

		it('reject when sending multiple codes and not is hasMany', () => {
			expect(() =>
				validateProperty('StartType', 'testRelationship', [
					'lowercase1',
					'lowercase2',
				]),
			).toThrow(/Can only have one testRelationship/);
		});

		it('reject when writing to cypher relationship', () => {
			expect(() =>
				validateProperty('StartType', 'testCypherRelationship', 'code'),
			).toThrow(
				/Cannot write relationship `testCypherRelationship` - it is defined using a custom, read-only query/,
			);
		});

		it('accept when all is correct', () => {
			expect(() =>
				validateProperty('StartType', 'testRelationship', 'lowercase'),
			).not.toThrow();
		});
	});

	describe('validating relationship properties', () => {
		let validateProperty;
		beforeEach(() => {
			const types = [
				{
					name: 'StartType',
					properties: {
						testRelWithProps: { type: 'RelationshipType' },
						testRelWithoutProps: {
							type: 'EndType',
							direction: 'outgoing',
							relationship: 'HAS_ENDTYPE',
							hasMany: true,
						},
					},
				},
				{
					name: 'EndType',
					properties: {
						code: { pattern: 'LOWERCASE', type: 'String' },
						isTestRelWithProps: {
							type: 'RelationshipType',
						},
						isTestRelWithoutProps: {
							relationship: 'HAS_ENDTYPE',
							type: 'StartType',
							direction: 'incoming',
							hasMany: true,
						},
					},
				},
			];
			const relationshipTypes = [
				{
					name: 'RelationshipType',
					relationship: 'HAS',
					from: { type: 'StartType', hasMany: true },
					to: { type: 'EndType', hasMany: true },
					properties: {
						someString: { type: 'Word' },
					},
				},
			];
			validateProperty = getValidator(types, { relationshipTypes });
		});

		it('reject when relationship node code is invalid', () => {
			expect(() =>
				validateProperty('StartType', 'testRelWithProps', {
					code: 'UPPERCASE',
				}),
			).toThrow(
				'Invalid value `UPPERCASE` for property `code` on type `EndType`: Must match pattern /^[a-z]+$/',
			);
		});

		it('reject when relationship property is invalid', () => {
			expect(() =>
				validateProperty('StartType', 'testRelWithProps', {
					someString: 1234,
				}),
			).toThrow(
				'Invalid value `1234` for property `someString` on type `RelationshipType`: Must be a string',
			);
		});

		it('not accept if not in schema', () => {
			expect(() =>
				validateProperty('StartType', 'testRelWithProps', {
					code: 'lowercase',
					notInSchema: 'a string',
				}),
			).toThrow(
				/Invalid property `notInSchema` on type `RelationshipType`/,
			);
		});

		it('not accept property but code if the type does not accept relationship properties', () => {
			expect(() =>
				validateProperty('StartType', 'testRelWithoutProps', {
					code: 'lowercase',
				}),
			).not.toThrow();

			expect(() =>
				validateProperty('StartType', 'testRelWithoutProps', {
					someString: 'some string',
				}),
			).toThrow(
				/`testRelWithoutProps` does not accept relationship properties/,
			);
		});

		it('accept when all is correct', () => {
			expect(() =>
				validateProperty('StartType', 'testRelWithProps', {
					code: 'lowercase',
					someString: 'some string',
				}),
			).not.toThrow();
		});
	});
});

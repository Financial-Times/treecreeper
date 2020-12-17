// Run AJV against the entire schema
// Throw big errors object if found
// If that passes, run some assertions cross-referencing
const Ajv = require('ajv').default;
const sdk = require('./sdk');

const ajv = new Ajv({ allErrors: true });

(async function () {
	await sdk.ready();
	const schema = {
		...sdk.rawData.getAll(),
	};

	const { enumsSchema } = require('./enums');
	const { typeSchema, relationshipTypeSchema } = require('./type');
	const { typeHierarchySchema } = require('./type-hierarchy');
	const { stringPatternsSchema } = require('./string-patterns');
	const { primitiveTypesSchema } = require('./primitive-types');

	const schemaValidator = {
		type: 'object',
		properties: {
			enums: enumsSchema,
			types: {
				type: 'array',
				items: typeSchema,
			},
			relationshipTypes: {
				type: 'array',
				items: relationshipTypeSchema,
			},
			typeHierarchy: typeHierarchySchema,
			stringPatterns: stringPatternsSchema,
			primitiveTypes: primitiveTypesSchema,
		},
	};

	if (!ajv.validate(schemaValidator, schema.schema)) {
		console.dir(new Ajv.ValidationError(ajv.errors), { depth: 10 });
	}
})();

// const propertyTestSuite = ({ typeName, properties, fieldsets }) => {
// 	const typeNames = sdk.getTypes().map(({ name }) => name);
// 	const relationshipTypeNames = sdk
// 		.getRelationshipTypes()
// 		.map(({ name }) => name);
// 	const declaredTypeNames = [].concat(typeNames, relationshipTypeNames);

// 	const validPropTypes = validEnums.concat(
// 		Object.keys(primitiveTypesMap),
// 		declaredTypeNames,
// 	);
// 	const validFieldsetNames = fieldsets
// 		? ['self'].concat(Object.keys(fieldsets))
// 		: [];

// 	Object.entries(properties).forEach(([name, config]) => {
// 		describe(`${name}`, () => {

// 			it('has valid fieldset', () => {
// 				if (config.fieldset) {
// 					expect(validFieldsetNames).toContain(config.fieldset);
// 				}
// 			});

// 						it('is defined at both ends', () => {
// 							expect(
// 								getTwinnedRelationship(
// 									typeName,
// 									config.type,
// 									config.relationship,
// 									config.direction,
// 								),
// 							).toBeDefined();
// 						});
// 					}
// 				});

// const relationshipTestSuite = type => {
// 	describe(`${type.name} as Relationship`, () => {

// 		const types = sdk.rawData.getTypes();
// 		const { properties = {}, from, to } = type;

// 		describe('relationship endpoints', () => {

// 			if (from.type !== to.type) {
// 				it('from type makes use of this relationship type', () => {
// 					const endType = types.find(t => t.name === to.type);
// 					const propertiesUsingRelationshipType = Object.values(
// 						endType.properties,
// 					).filter(prop => prop.type === type.name);
// 					expect(propertiesUsingRelationshipType.length).toBe(1);
// 				});
// 				it('to type makes use of this relationship type', () => {
// 					const endType = types.find(t => t.name === from.type);
// 					const propertiesUsingRelationshipType = Object.values(
// 						endType.properties,
// 					).filter(prop => prop.type === type.name);
// 					expect(propertiesUsingRelationshipType.length).toBe(1);
// 				});
// 			} else {
// 				it('has deterministic direction', () => {
// 					const typeDef = types.find(t => t.name === from.type);
// 					const propertiesUsingRelationshipType = Object.values(
// 						typeDef.properties,
// 					).filter(prop => prop.type === type.name);

// 					expect(propertiesUsingRelationshipType.length).toBe(2);
// 					const startRel = propertiesUsingRelationshipType.find(
// 						prop => prop.direction === 'outgoing',
// 					);
// 					expect(startRel).toBeDefined();
// 					const endRel = propertiesUsingRelationshipType.find(
// 						prop => prop.direction === 'incoming',
// 					);
// 					expect(endRel).toBeDefined();
// 				});
// 			}
// 		});
// 	});

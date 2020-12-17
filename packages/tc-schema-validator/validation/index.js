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

	// Check all relationships are defined at both ends "getTwinnedRelationship"
	// Check all relationshipTypes are referenced from both ends "describe('relationship endpoints'"
	// Check each relationship defines direction in one place only: on the relationshipType if not reflexive, otherwise on the type

	// Check GraphQL schema builds OK
	require('./presentational-structure')

	// Check GraphQL schema builds OK
	require('./graphql-defs')
})();

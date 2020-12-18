const { enumsSchema } = require('./enums');
const { stringPatternsSchema } = require('./string-patterns');
const { primitiveTypesSchema } = require('./primitive-types');

const getJsonSchema = () => {
	// These depend on the sdk already being initialised
	const { typeSchema, relationshipTypeSchema } = require('./type'); // eslint-disable-line global-require
	const { typeHierarchySchema } = require('./type-hierarchy'); // eslint-disable-line global-require

	return {
		type: 'object',
		properties: {
			enums: enumsSchema,
			stringPatterns: stringPatternsSchema,
			primitiveTypes: primitiveTypesSchema,
			relationshipTypes: {
				type: 'array',
				items: relationshipTypeSchema,
			},
			types: {
				type: 'array',
				items: typeSchema,
			},
			typeHierarchy: typeHierarchySchema,
		},
	};
};

module.exports = { getJsonSchema };

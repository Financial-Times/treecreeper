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
};

module.exports = { getJsonSchema };

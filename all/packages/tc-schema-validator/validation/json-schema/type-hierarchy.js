const { types } = require('./references');

module.exports = {
	typeHierarchySchema: {
		$schema: 'http://json-schema.org/schema#',
		$id: 'http://biz-ops-in.ft.com/schemas/treecreeper/type-hierarchy.json',
		type: 'object',
		additionalProperties: {
			type: 'object',
			properties: {
				label: { type: 'string' },
				description: { type: 'string' },
				types: {
					type: 'array',
					items: {
						type: 'string',
						enum: types,
						errorMessage:
							'The list of types in this part of the type hierarchy contains a type name that is not defined in the schema. Is it a typo?',
					},
				},
			},
			additionalProperties: false,
			required: ['label', 'description', 'types'],
		},
	},
};

const enumSchema = {
	$schema: 'http://json-schema.org/schema#',
	$id: 'http://biz-ops-in.ft.com/schemas/treecreeper/enum.json',
	type: 'object',
	properties: {
		description: { type: 'string' },
		options: {
			if: {
				type: 'object',
			},
			then: {
				type: 'object',
				propertyNames: {
					pattern: '^[a-zA-Z]+$',
				},
				additionalProperties: { type: 'string' },
			},
			else: {
				type: 'array',
				items: { type: 'string', pattern: '^[a-zA-Z]+$' },
			},
		},
	},
	additionalProperties: false,
	required: ['description', 'options'],
};

const enumsSchema = {
	type: 'object',
	additionalProperties: enumSchema,
	propertyNames: {
		pattern: '^[A-Z][a-zA-Z]+$',
	},
};

module.exports = {
	enumsSchema,
};

const { ENUM_NAME, ENUM_OPTION } = require('./references');

const enumSchema = {
	$schema: 'http://json-schema.org/schema#',
	$id: 'http://biz-ops-in.ft.com/schemas/treecreeper/enum.json',
	type: 'object',
	properties: {
		description: { type: 'string' },
		isTest: { type: 'boolean' },
		options: {
			if: {
				type: 'object',
			},
			then: {
				type: 'object',
				propertyNames: {
					pattern: ENUM_OPTION,
				},
				additionalProperties: { type: 'string' },
			},
			else: {
				type: 'array',
				items: { type: 'string', pattern: ENUM_OPTION },
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
		pattern: ENUM_NAME,
	},
};

module.exports = {
	enumsSchema,
};

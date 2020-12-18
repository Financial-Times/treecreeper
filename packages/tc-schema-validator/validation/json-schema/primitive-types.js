module.exports = {
	primitiveTypesSchema: {
		type: 'object',
		additionalProperties: {
			type: 'object',
			additionalProperties: false,
			properties: {
				component: { type: 'string', pattern: '^[A-Z]' },
				graphql: {
					type: 'string',
					enum: [
						'String',
						'Date',
						'Time',
						'DateTime',
						'Int',
						'Float',
						'Boolean',
					],
				},
			},
		},
	},
};

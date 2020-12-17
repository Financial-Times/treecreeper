// TOD check actually evaluates to valid regex.... but then again, maybe _EVERY_ string does?

module.exports = {
	stringPatternsSchema: {
		type: 'object',
		propertyNames: {
			pattern: '^(?=.{2,64}$)[A-Z][A-Z_]*[A-Z]$',
		},
		additionalProperties: {
			oneOf: [
				{ type: 'string', pattern: '^\\^.*\\$$' },
				{
					type: 'object',
					properties: {
						pattern: { type: 'string', pattern: '^\\^.*\\$$' },
						flags: { type: 'string', pattern: '^[i]+$' },
					},
					additionalProperties: false,
				},
			],
		},
	},
};

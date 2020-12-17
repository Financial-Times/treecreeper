module.exports = {
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

					// TODO one of the type names and also exhaustively cover them all
				},
			},
		},
	},
};

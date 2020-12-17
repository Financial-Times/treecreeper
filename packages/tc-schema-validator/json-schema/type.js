const {
	allTypes,
	simpleTypes,
	relationshipTypes,
	types,
	complexTypes,
	stringPatterns,
	enums,
} = require('./lists');

const SYSTEM_CODE = '[a-z][\\-a-z]+[a-z]';

const hasManyRule = {
	if: {
		properties: {
			type: {
				enum: enums.concat(types),
			},
		},
	},
	then: {
		properties: { hasMany: { type: 'boolean' } },
	},
};

const booleanLabelsRule = {
	if: {
		properties: {
			type: {
				enum: ['boolean'],
			},
		},
	},
	then: {
		properties: {
			trueLabel: { type: 'string' },
			falseLabel: { type: 'string' },
		},
	},
};

const relationshipOrPropertyRule = {
	if: {
		properties: { type: { enum: complexTypes } },
	},
	then: {
		properties: {
			cypher: { type: 'string' },
			direction: {
				type: 'string',
				enum: ['incoming', 'outgoing'],
			},
			relationship: {
				type: 'string',
				pattern: '^(?=.{2,64}$)[A-Z][A-Z_]*[A-Z]$',
			},
			showInactive: { type: 'boolean' },
			writeInactive: { type: 'boolean' },
		},
		dependencies: {
			direction: {
				properties: {
					cypher: false,
					relationship: true,
				},
			},
			relationship: {
				properties: {
					direction: true,
					cypher: false,
				},
			},
			cypher: {
				properties: {
					direction: false,
					relationship: false,
				},
			},
		},
	},
	else: {
		properties: {
			unique: { type: 'boolean' },
			required: { type: 'boolean' },
			canIdentify: { type: 'boolean' },
			useInSummary: { type: 'boolean' },
			pattern: { type: 'string', enum: stringPatterns },
			examples: {
				type: 'array',
				items: { type: 'string' },
			},
		},
	},
};

const getPropertiesSchema = ({ forRelationships = false } = {}) => {
	const propertyDefSchema = {
		type: 'object',
		properties: {
			label: { type: 'string', not: { pattern: '[.!]$' } },
			description: { type: 'string', pattern: '[.!?]$' },
			type: {
				type: 'string',
				enum: forRelationships ? simpleTypes : allTypes,
			},
			// do we need to avod multiline deprecation reasons once we're on graphql compose?
			deprecationReason: { type: 'string', not: { pattern: '\n' } },
			lockedBy: {
				type: 'array',
				items: { type: 'string', pattern: SYSTEM_CODE },
			},
			// TODO get an enum somehow
			fieldset: { type: 'string' },
		},
		required: ['label', 'description', 'type'],
		// TODO see if this can work alongside conditional property rules
		// additionalProperties: false,
		allOf: [
			hasManyRule,
			booleanLabelsRule,
			relationshipOrPropertyRule,
			{
				if: {
					properties: {
						type: { enum: relationshipTypes },
					},
				},
				then: {
					propertyNames: {
						not: { enum: ['relationship'] },
					},
				},

				// 	// // 					it('may have direction', () => {
				// 	// // 						if (config.direction) {
				// 	// // 							expect(config.direction).toMatch(
				// 	// // 								/^incoming|outgoing$/,
				// 	// // 							);
				// 	// // 						}
				// 	// // 					});
				// 	// // 					it('can determine relationship direction explicitly', () => {
				// 	// // 						const relType = relationshipTypes.find(
				// 	// // 							rel => rel.name === config.type,
				// 	// // 						);

				// 	// // 						expect(relType).toBeDefined();
				// 	// // 						if (relType.from.type === relType.to.type) {
				// 	// // 							expect(config.direction).toBeDefined();
				// 	// // 						}
				// 	// // 					});
				// 	// // 				});
			},
		],
	};

	const propertiesSchema = {
		type: 'object',
		propertyNames: {
			// NOTE this regex is already defined elsewhere
			pattern: '^(?=.{2,64}$)[a-z][a-zA-Z\\d]+$',
			// banned words
			not: { enum: ['type'] },
		},
		additionalProperties: propertyDefSchema,
	};

	if (!forRelationships) {
		propertiesSchema.properties = {
			// todo expect it to have canIdentify... hmmm, but does the sdk add this anyway?
			// also expect a pattern... but again do we get a default?
			code: propertyDefSchema,
		};
		propertiesSchema.required = ['code'];
	}

	return propertiesSchema;
};

const typeSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		name: { type: 'string' },
		description: { type: 'string' },
		moreInformation: { type: 'string' },

		pluralName: { type: 'string' }, // TODO expect to not be same as name
		creationURL: { type: 'string' }, // TODO valid against a url regex
		createPermissions: {
			type: 'array',
			items: { type: 'string', pattern: SYSTEM_CODE },
		},
		minimumViableRecord: {
			type: 'array',
			items: {
				// TODO should cross reference property names
				// TODO expect length of at least 1
				type: 'string',
			},
		},
		// TODO flesh this out. Again, cross reference property names
		inactiveRule: { type: 'object' },
		properties: getPropertiesSchema(),
		fieldsets: {
			type: 'object',
			additionalProperties: {
				type: 'object',
				properties: {
					heading: {
						type: 'string',
						not: { enum: ['Miscellaneous', 'General'] },
					},
					description: { type: 'string' },
				},
				required: ['heading'],
			},
			propertyNames: {
				not: { enum: ['misc'] },
			},
		},
	},
	required: ['name', 'description', 'properties'],
};

const fromOrTo = {
	type: 'object',
	additionalProperties: false,
	required: ['type'],
	properties: {
		type: { type: 'string', enum: types },
		hasMany: { type: 'boolean' },
	},
};

const relationshipTypeSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		name: { type: 'string' },
		from: fromOrTo,
		to: fromOrTo,
		relationship: { type: 'string' },
		properties: getPropertiesSchema({ forRelationships: true }),
	},
	required: ['name', 'from', 'to', 'relationship'],
};

module.exports = { typeSchema, relationshipTypeSchema };

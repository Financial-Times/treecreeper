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
		properties: {type: {
			enum: enums.concat(types),
		}},
	},
	then: {
		properties: { hasMany: { type: 'boolean' } },
	},
};

const booleanLabelsRule = {
	if: {
		properties: {type: {
			enum: ['boolean'],
		}},
	},
	then: {
		properties: {
			trueLabel: { type: 'string' },
			falseLabel: { type: 'string' },
		},
	},
};

const relationshipIndicatorsRule = {
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
		additionalProperties: false,
		allOf: [
			hasManyRule,
			booleanLabelsRule,
			relationshipIndicatorsRule,
			{
				if: {
					properties: {
						type: { enum: relationshipTypes },
					},
				},
				then: {
					propertyNames: {
						not: {enum: ['relationship']},
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
			pattern: '^(?=.{2,64}$)[a-z][a-zA-Zd]+$',
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

// const propertyTestSuite = ({ typeName, properties, fieldsets }) => {
// 	const typeNames = sdk.getTypes().map(({ name }) => name);
// 	const relationshipTypeNames = sdk
// 		.getRelationshipTypes()
// 		.map(({ name }) => name);
// 	const declaredTypeNames = [].concat(typeNames, relationshipTypeNames);

// 	const validPropTypes = validEnums.concat(
// 		Object.keys(primitiveTypesMap),
// 		declaredTypeNames,
// 	);
// 	const validFieldsetNames = fieldsets
// 		? ['self'].concat(Object.keys(fieldsets))
// 		: [];

// 	Object.entries(properties).forEach(([name, config]) => {
// 		describe(`${name}`, () => {

// 			it('has valid fieldset', () => {
// 				if (config.fieldset) {
// 					expect(validFieldsetNames).toContain(config.fieldset);
// 				}
// 			});

// 						it('is defined at both ends', () => {
// 							expect(
// 								getTwinnedRelationship(
// 									typeName,
// 									config.type,
// 									config.relationship,
// 									config.direction,
// 								),
// 							).toBeDefined();
// 						});
// 					}
// 				});

// const relationshipTestSuite = type => {
// 	describe(`${type.name} as Relationship`, () => {

// 		const types = sdk.rawData.getTypes();
// 		const { properties = {}, from, to } = type;

// 		describe('relationship endpoints', () => {

// 			if (from.type !== to.type) {
// 				it('from type makes use of this relationship type', () => {
// 					const endType = types.find(t => t.name === to.type);
// 					const propertiesUsingRelationshipType = Object.values(
// 						endType.properties,
// 					).filter(prop => prop.type === type.name);
// 					expect(propertiesUsingRelationshipType.length).toBe(1);
// 				});
// 				it('to type makes use of this relationship type', () => {
// 					const endType = types.find(t => t.name === from.type);
// 					const propertiesUsingRelationshipType = Object.values(
// 						endType.properties,
// 					).filter(prop => prop.type === type.name);
// 					expect(propertiesUsingRelationshipType.length).toBe(1);
// 				});
// 			} else {
// 				it('has deterministic direction', () => {
// 					const typeDef = types.find(t => t.name === from.type);
// 					const propertiesUsingRelationshipType = Object.values(
// 						typeDef.properties,
// 					).filter(prop => prop.type === type.name);

// 					expect(propertiesUsingRelationshipType.length).toBe(2);
// 					const startRel = propertiesUsingRelationshipType.find(
// 						prop => prop.direction === 'outgoing',
// 					);
// 					expect(startRel).toBeDefined();
// 					const endRel = propertiesUsingRelationshipType.find(
// 						prop => prop.direction === 'incoming',
// 					);
// 					expect(endRel).toBeDefined();
// 				});
// 			}
// 		});
// 	});

module.exports = {typeSchema, relationshipTypeSchema}

const {
	allTypes,
	simpleTypes,
	types,
	complexTypes,
	stringPatterns,
	enums,
	SYSTEM_CODE,
	TYPE_NAME,
	CAPITAL_SNAKE_CASE,
	PROPERTY_NAME,
} = require('./references');

const typeName = {
	type: 'string',
	pattern: TYPE_NAME,
	errorMessage:
		'Type name should be all alphabetical characters, starting with a capital letter',
};
const onlyForRelationships = {
	properties: { type: { enum: complexTypes } },
};

const onlyForProperties = {
	properties: { type: { enum: simpleTypes } },
};

const onlyForBooleans = {
	properties: {
		type: {
			enum: ['Boolean'],
		},
	},
};

const getPropertiesSchema = ({ forRelationships = false } = {}) => {
	const propertyDefSchema = {
		type: 'object',
		properties: {
			isBeta: {type: 'boolean'},
			label: { type: 'string', not: { pattern: '[.!]\\s*$' } },
			description: { type: 'string', pattern: '[.!?]\\s*$' },
			type: {
				type: 'string',
				enum: forRelationships ? simpleTypes : allTypes,
			},
			// TODO: do we need to avoid multiline deprecation reasons once we're on graphql compose?
			deprecationReason: { type: 'string', not: { pattern: '\n' } },
			lockedBy: {
				type: 'array',
				items: { type: 'string', pattern: SYSTEM_CODE },
			},
			fieldset: { type: 'string' },
			cypher: { type: 'string' },
			direction: {
				type: 'string',
				enum: ['incoming', 'outgoing'],
			},
			relationship: {
				type: 'string',
				pattern: CAPITAL_SNAKE_CASE,
			},
			showInactive: { type: 'boolean' },
			writeInactive: { type: 'boolean' },
			unique: { type: 'boolean' },
			required: { type: 'boolean' },
			canIdentify: { type: 'boolean' },
			useInSummary: { type: 'boolean' },
			pattern: { type: 'string', enum: stringPatterns },
			examples: {
				type: 'array',
				items: { type: 'string' },
			},
			hasMany: { type: 'boolean' },
			trueLabel: { type: 'string' },
			falseLabel: { type: 'string' },
		},
		required: ['label', 'description', 'type'],
		additionalProperties: false,

		dependencies: {
			cypher: {
				properties: {
					type: { enum: types },
					direction: false,
					relationship: false,
				},
			},
			direction: {
				properties: {
					...onlyForRelationships.properties,
					cypher: false,
					relationship: true,
				},
			},
			relationship: {
				properties: {
					type: { enum: types },
					direction: true,
					cypher: false,
				},
			},
			showInactive: onlyForRelationships,
			writeInactive: onlyForRelationships,
			unique: onlyForProperties,
			required: onlyForProperties,
			canIdentify: onlyForProperties,
			useInSummary: onlyForProperties,
			pattern: onlyForProperties,
			examples: onlyForProperties,
			hasMany: {
				properties: {
					type: {
						enum: enums.concat(types),
					},
				},
			},
			trueLabel: onlyForBooleans,
			falseLabel: onlyForBooleans,
		},
	};

	const propertiesSchema = {
		type: 'object',
		propertyNames: {
			pattern: PROPERTY_NAME,
			// banned words
			not: { enum: forRelationships ? ['from', 'to', 'type'] : ['type'] },
		},
		additionalProperties: propertyDefSchema,
	};

	if (!forRelationships) {
		propertiesSchema.properties = {
			// Note - the schema-sdk automatically adds lots of required properties to
			// the `code`` propDef, so no need to validate for them at teh schema
			// authoring stage
			code: {
				...propertyDefSchema,
				// note that for codes we always expect a pattern so it's not a free for all
				required: [...propertyDefSchema.required, 'pattern'],
			},
		};
		propertiesSchema.required = ['code'];
	}

	return propertiesSchema;
};

const typeSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		isBeta: {type: 'boolean'},
		name: typeName,
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
				additionalProperties: false,
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
		isBeta: {type: 'boolean'},
		name: typeName,
		from: fromOrTo,
		to: fromOrTo,
		relationship: { type: 'string', pattern: CAPITAL_SNAKE_CASE },
		properties: getPropertiesSchema({ forRelationships: true }),
	},
	required: ['name', 'from', 'to', 'relationship', 'properties'],
};

module.exports = { typeSchema, relationshipTypeSchema };

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

const onlyForRelationships = {
  properties: { type: { enum: complexTypes } },
}

const onlyForProperties = {
  properties: { type: { enum: simpleTypes } },
}

const onlyForBooleans = {
		properties: {
			type: {
				enum: ['boolean'],
			},
		},
	}

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
			fieldset: { type: 'string' },
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

		"dependencies": {
	    cypher: {
	    	properties: {
	    		type: { enum: types },
	    		direction: false,
					relationship: false,
	    	}
	    },
			direction: {
	    	properties: {
	    		...onlyForRelationships.properties,
	    		cypher: false,
					relationship: true,
	    	}
	    },
			relationship: {
	    	properties: {
	    		type: { enum: types },
	    		direction: true,
					cypher: false,
	    	}
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
			falseLabel: onlyForBooleans
	  },
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

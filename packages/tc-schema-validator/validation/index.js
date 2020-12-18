#!/usr/bin/env node
const Ajv = require('ajv').default;
const ajvErrors = require("ajv-errors");
const sdk = require('./sdk');
const { getJsonSchema } = require('./json-schema');
const { validateGraphQL } = require('./ad-hoc/graphql-defs');
const {
	validatePresentationalStructure,
} = require('./ad-hoc/presentational-structure');
const {
	validateRelationshipConsistency,
} = require('./ad-hoc/relationship-consistency');

const ajv = new Ajv({ allErrors: true });

ajvErrors(ajv);


const signpostTypeError = (error, kind) => {
		const [,typeIndex,topLevelProperty,property,propDefPart] = (/^\/[a-zA-Z]+\/(\d+)(?:\/([^\/]+)(?:\/([^\/]+)(?:\/([^\/]+))?)?)?/.exec(error.dataPath) || [])
		const typeDef = sdk.rawData.getTypes()[typeIndex]

		if (propDefPart) {
			error.signpost = `Problem in the \`${propDefPart}\` supplied for the \`${property}\` property of the \`${typeDef.name}\` ${kind}`
		} else if (property) {
			error.signpost = `Problem in the \`${property}\` property of the \`${typeDef.name}\` ${kind}`
		} else if (topLevelProperty) {
			error.signpost = `Problem in the \`${topLevelProperty}\` section of the \`${typeDef.name}\` ${kind}`
		} else {
			error.signpost = `Problem in the \`${typeDef.name}\` ${kind}`
		}
}

const signpost = (sdk) => (error) => {
	if (/^\/typeHierarchy/.test(error.dataPath)) {
		error.signpost = `Problem in the \`${/^\/typeHierarchy\/([^\/]+)/.exec(error.dataPath)[1]}\` category in the type hierarchy part of the schema`
	}
	if (/^\/relationshipTypes/.test(error.dataPath)) {
		signpostTypeError(error, 'relationship type')
	}
	if (/^\/types/.test(error.dataPath)) {
		signpostTypeError(error, 'type')
	}
	if (/^\/stringPatterns/.test(error.dataPath)) {
		error.signpost = `Problem in the string patterns part of the schema`
	}
	if (/^\/primitiveTypes/.test(error.dataPath)) {
		error.signpost = `Problem in the primitive types part of the schema`
	}
	if (/^\/enums/.test(error.dataPath)) {
		error.signpost = `Problem in the \`${/^\/enums\/([^\/]+)/.exec(error.dataPath)[1]}\` category in the enums part of the schema`
	}

	// delete error.schemaPath
	// delete error.dataPath
	// delete error.keyword
}

(async function () {
	await sdk.ready();
	const schema = {
		...sdk.rawData.getAll(),
	};
	const schemaValidator = getJsonSchema();

	if (!ajv.validate(schemaValidator, schema.schema)) {
		ajv.errors.map(signpost(sdk))
		ajv.errors = ajv.errors.filter(err => err.keyword !== 'if')
		console.dir(new Ajv.ValidationError(ajv.errors), { depth: 10 });
	}
	validatePresentationalStructure();
	validateRelationshipConsistency();
	validateGraphQL();
})();

process.on('unhandledRejection', error => {
  console.error(error);
  console.error('Exiting process')
  process.exit(2)
});

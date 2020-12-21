#!/usr/bin/env node
const Ajv = require('ajv').default;
const ajvErrors = require('ajv-errors');
const sdk = require('./sdk');
const { getJsonSchema } = require('./json-schema');
const { validateFileNames } = require('./ad-hoc/file-names');
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
	// this takes e.g. /types/0/properties/code/type and splits into its constituent parts
	const [
		typeIndex,
		topLevelProperty,
		property,
		propDefPart,
	] = error.dataPath.split('/').slice(2);

	const typeDef = sdk.rawData[
		kind === 'type' ? 'getTypes' : 'getRelationshipTypes'
	]()[typeIndex];

	if (topLevelProperty === 'properties') {
		if (propDefPart) {
			error.signpost = `Problem in the \`${propDefPart}\` supplied for the \`${property}\` property of the \`${typeDef.name}\` ${kind}`;
			return;
		}
		if (property) {
			error.signpost = `Problem in the \`${property}\` property of the \`${typeDef.name}\` ${kind}`;
			return;
		}
	}

	if (property) {
		error.signpost = `Problem in \`${property}\` of the \`${topLevelProperty}\` section of the \`${typeDef.name}\` ${kind}`;
	} else if (topLevelProperty) {
		error.signpost = `Problem in the \`${topLevelProperty}\` section of the \`${typeDef.name}\` ${kind}`;
	} else {
		error.signpost = `Problem in the \`${typeDef.name}\` ${kind}`;
	}
};

const signpost = error => {
	if (/^\/typeHierarchy/.test(error.dataPath)) {
		error.signpost = `Problem in the \`${
			/^\/typeHierarchy\/([^/]+)/.exec(error.dataPath)[1]
		}\` category in the type hierarchy part of the schema`;
	}
	if (/^\/relationshipTypes/.test(error.dataPath)) {
		signpostTypeError(error, 'relationship type');
	}
	if (/^\/types/.test(error.dataPath)) {
		signpostTypeError(error, 'type');
	}
	if (/^\/stringPatterns/.test(error.dataPath)) {
		error.signpost = `Problem in the string patterns part of the schema`;
	}
	if (/^\/primitiveTypes/.test(error.dataPath)) {
		error.signpost = `Problem in the primitive types part of the schema`;
	}
	if (/^\/enums/.test(error.dataPath)) {
		error.signpost = `Problem in the \`${
			/^\/enums\/([^/]+)/.exec(error.dataPath)[1]
		}\` category in the enums part of the schema`;
	}
	// these require quite a lot of context about how JSON schema actually works
	// in order to comprehend. All the work done above generates humabn readable
	// strings which should provide enough context without them
	delete error.schemaPath;
	delete error.dataPath;
	delete error.keyword;
};

const fail = () => {
	console.error('Treecreeper schema files invalid');
	process.exit(2);
}

(async function () {
	console.log('Validating treecreeper schema files');
	await sdk.ready();
	validateFileNames();
	const schema = {
		...sdk.rawData.getAll(),
	};
	const schemaValidator = getJsonSchema();

	if (!ajv.validate(schemaValidator, schema.schema)) {
		ajv.errors.map(signpost);
		ajv.errors = ajv.errors.filter(err => err.keyword !== 'if');
		console.dir(new Ajv.ValidationError(ajv.errors), { depth: 10 });
		fail()
	}
	validatePresentationalStructure();
	validateRelationshipConsistency();
	validateGraphQL();
	console.log('Treecreeper schema files valid');
})();

process.on('unhandledRejection', error => {
	console.error(error);
	fail();
});

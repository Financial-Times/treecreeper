// Run AJV against the entire schema
// Throw big errors object if found
// If that passes, run some assertions cross-referencing
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

const signpost = error => {
	if (/^\/typeHierarchy/.test(error.dataPath)) {
		error.signpost = `Look in the \`${/^\/typeHierarchy\/([^\/]+)/.exec(error.dataPath)[1]}\` category in the type hierarchy part of the schema`
	}
	if (/^\/stringPatterns/.test(error.dataPath)) {
		error.signpost = `Look in the string patterns part of the schema`
	}
	// delete error.schemaPath
	// delete error.dataPath
	// delete error.keyword
	// delete error.params
}

(async function () {
	await sdk.ready();
	const schema = {
		...sdk.rawData.getAll(),
	};
	const schemaValidator = getJsonSchema();

	if (!ajv.validate(schemaValidator, schema.schema)) {
		ajv.errors.map(signpost)
		ajv.errors = ajv.errors.filter(err => err.keyword !== 'if')
		console.dir(new Ajv.ValidationError(ajv.errors), { depth: 10 });
	}
	validatePresentationalStructure();
	validateRelationshipConsistency();
	validateGraphQL();
})();

process.on('unhandledRejection', error => {
  console.error(error);
  process.exit(2)
});

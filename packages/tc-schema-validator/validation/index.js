// Run AJV against the entire schema
// Throw big errors object if found
// If that passes, run some assertions cross-referencing
const Ajv = require('ajv').default;
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

(async function () {
	await sdk.ready();
	const schema = {
		...sdk.rawData.getAll(),
	};
	const schemaValidator = getJsonSchema();

	if (!ajv.validate(schemaValidator, schema.schema)) {
		console.dir(new Ajv.ValidationError(ajv.errors), { depth: 10 });
	}
	validatePresentationalStructure();
	validateRelationshipConsistency();
	validateGraphQL();
})();

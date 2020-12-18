// Run AJV against the entire schema
// Throw big errors object if found
// If that passes, run some assertions cross-referencing
const Ajv = require('ajv').default;
const sdk = require('./sdk');
const {getJsonSchema} = require('./json-schema')
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

	require('./ad-hoc/presentational-structure')
	require('./ad-hoc/graphql-defs')
})();

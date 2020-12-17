// Run AJV against the entire schema
// Throw big errors object if found
// If that passes, run some assertions cross-referencing
const Ajv = require('ajv').default;
const sdk = require('./sdk');

const ajv = new Ajv({ allErrors: true });

(async function () {
	await sdk.ready();
	const schema = {
		...sdk.rawData.getAll(),
	}

	const {enumsSchema} = require('./enums');
	const {typeSchema, relationshipTypeSchema} = require('./type')


	const schemaValidator = {
		type: 'object',
		properties: {
			enums: enumsSchema,
			types: {
				type: 'array',
				items: typeSchema
			},
			relationships: {
				type: 'array',
				items: typeSchema
			}
		}
	};
	try {

		if (!ajv.validate(schemaValidator, schema)) {
			console.error(ajv.errors)
		};
	} catch (err) {
			console.log('erasdsadsad')
		console.log(err)
	}
})()

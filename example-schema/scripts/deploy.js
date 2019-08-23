const { sendSchemaToS3 } = require('../../packages/schema-publisher');
const { SchemaConsumer } = require('../../packages/schema-consumer');

// TODO - should have explicit 'getLocal()' method??
const schemaObject = Object.assign(
	{},
	new SchemaConsumer({
		rawDataDirectory: `${process.cwd()}/schema/schema`,
	}).getAll(),
	{
		version: process.env.CIRCLE_TAG,
	},
);

sendSchemaToS3('latest', schemaObject).then(
	() => console.log('successfully deployed'),
	err => {
		console.error('Failed to deploy');
		console.error(err);
		process.exit(2); // eslint-disable-line unicorn/no-process-exit
	},
);

const { sendSchemaToS3 } = require('..');
const { SchemaUpdater } = require('../../../packages/schema-updater');

// TODO - should have explicit 'getLocal()' method??
const schemaObject = Object.assign(
	{},
	new SchemaUpdater({
		rawDataDirectory: process.env.TREECREEPER_SCHEMA_DIRECTORY,
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

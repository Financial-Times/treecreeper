const { sendSchemaToS3 } = require('../../packages/schema-publisher');
const RawData = require('../lib/raw-data');

const schemaObject = Object.assign({}, new RawData().getAll(), {
	version: process.env.CIRCLE_TAG,
});

sendSchemaToS3('latest', schemaObject).then(
	() => console.log('successfully deployed'),
	err => {
		console.error('Failed to deploy');
		console.error(err);
		process.exit(2); // eslint-disable-line unicorn/no-process-exit
	},
);

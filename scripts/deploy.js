const sendSchemaToS3 = require('../lib/send-schema-to-s3');
const RawData = require('../lib/raw-data');

const schemaObject = Object.assign({}, new RawData().getAll(), {
	version: process.env.CIRCLE_TAG,
});

sendSchemaToS3('latest', schemaObject);

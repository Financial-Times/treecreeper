const sendSchemaToS3 = require('../lib/send-schema-to-s3');
const rawData = require('../lib/raw-data');

const schemaObject = {
	schema: {
		types: rawData.getTypes(),
		stringPatterns: rawData.getStringPatterns(),
		enums: rawData.getEnums(),
	},
	version: process.env.CIRCLE_TAG,
};

sendSchemaToS3('latest', schemaObject);

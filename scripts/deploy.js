const sendToS3 = require('../lib/send-to-s3');
const rawData = require('../lib/raw-data');

const content = JSON.stringify(
	{
		schema: {
			types: rawData.getTypes(),
			stringPatterns: rawData.getStringPatterns(),
			enums: rawData.getEnums(),
		},
		version: process.env.CIRCLE_SHA1,
		gitTag: process.env.CIRCLE_TAG,
	},
	null,
	2,
);

sendToS3(content, {
	environment: 'latest',
	data: process.env.CIRCLE_TAG,
});

const semver = require('semver');
const sendToS3 = require('../lib/send-to-s3');
const rawData = require('../lib/raw-data');

const content = JSON.stringify(
	{
		schema: {
			types: rawData.getTypes(),
			stringPatterns: rawData.getStringPatterns(),
			enums: rawData.getEnums(),
		},
		gitCommit: process.env.CIRCLECI_SHA1,
		gitTag: process.env.CIRCLE_TAG,
	},
	null,
	2,
);

sendToS3(content, {
	environment: 'latest',
	majorVersion: semver.major(process.env.CIRCLE_TAG),
	isPrerelease: !!semver.prerelease(process.env.CIRCLE_TAG),
});

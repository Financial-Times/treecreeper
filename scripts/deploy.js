const AWS = require('aws-sdk');
const { Readable } = require('stream');
const readYaml = require('../lib/read-yaml');

const s3Client = new AWS.S3({ region: 'eu-west-1' });

const content = JSON.stringify(
	{
		types: readYaml.directory('types'),
		stringPatterns: readYaml.file('string-patterns.yaml'),
		enums: readYaml.file('enums.yaml'),
		version: process.env.CIRCLECI_SHA1,
	},
	null,
	2,
);

const sendToS3 = async ({ body }) => {
	const uploadStream = new Readable();
	uploadStream.push(body);
	uploadStream.push(null);
	await s3Client
		.upload({
			Bucket: `biz-ops-schema`,
			// but how to prevent merge to master releasing the yaml, but not the lib
			// I think must do some npm check o master deploy to block deploy if
			// version here is not same as latest in npm
			// or maybe not hard code version here, but read from npm
			// or maybe master deploys to test, still need semver tag to deploy yaml?
			Key: `lib-v0/latest.json`,
			Body: uploadStream,
			ContentType: 'application/json',
		})
		.promise();
};

sendToS3(content);

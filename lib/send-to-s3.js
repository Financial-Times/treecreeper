const AWS = require('aws-sdk');
const { Readable } = require('stream');
const getSchemaFilename = require('./get-schema-filename');

const s3Client = new AWS.S3({ region: 'eu-west-1' });

const sendToS3 = async (content, { environment, versionData }) => {
	const schemaFilename = getSchemaFilename(versionData);
	const uploadStream = new Readable();
	uploadStream.push(content);
	uploadStream.push(null);
	await s3Client
		.upload({
			Bucket: `biz-ops-schema.${process.env.AWS_ACCOUNT_ID}`,
			Key: `${environment}/${schemaFilename}`,
			Body: uploadStream,
			ContentType: 'application/json',
		})
		.promise();
};

module.exports = sendToS3;

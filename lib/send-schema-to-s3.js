const AWS = require('aws-sdk');
const { Readable } = require('stream');
const getSchemaFilename = require('./get-schema-filename');

const s3Client = new AWS.S3({ region: 'eu-west-1' });

const sendSchemaToS3 = rawData => async environment => {
	const schemaObject = rawData.getAll();
	const { version } = schemaObject;
	const schemaFilename = getSchemaFilename(version);
	const schema = JSON.stringify(schemaObject, null, 2);

	const uploadStream = new Readable();
	uploadStream.push(schema);
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

module.exports = sendSchemaToS3;

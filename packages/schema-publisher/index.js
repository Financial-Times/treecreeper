const AWS = require('aws-sdk');
const { Readable } = require('stream');
const { getSchemaFilename } = require('../schema-file-name');

const s3Client = new AWS.S3({ region: 'eu-west-1' });

const sendSchemaToS3 = async (bucketName, environment, schemaObject) => {
	const { version } = schemaObject;
	const schemaFilename = getSchemaFilename(version);
	const schema = JSON.stringify(schemaObject, null, 2);

	const uploadStream = new Readable();
	uploadStream.push(schema);
	uploadStream.push(null);

	console.log(
		`Deploying schema to biz-ops-schema.${process.env.AWS_ACCOUNT_ID}/${environment}/${schemaFilename}`,
	);

	await s3Client
		.upload({
			Bucket: bucketName,
			Key: `${environment}/${schemaFilename}`,
			Body: uploadStream,
			ContentType: 'application/json',
		})
		.promise();
};

module.exports = { sendSchemaToS3 };

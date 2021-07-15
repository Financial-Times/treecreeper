const crypto = require('crypto');
const AWS = require('aws-sdk');
const { Readable } = require('stream');
const singletonSchema = require('@financial-times/tc-schema-sdk');

const s3Client = new AWS.S3({ region: 'eu-west-1' });

const getVersion = schemaObject => {
	const asString = JSON.stringify(schemaObject, null, 2);
	return crypto.createHash('md5').update(asString).digest('hex');
};

const sendSchemaToS3 = async (
	environment,
	bucketName = process.env.TREECREEPER_SCHEMA_BUCKET,
	schema = singletonSchema,
) => {
	await schema.ready();
	const schemaObject = {
		...schema.rawData.getAll(),
	};
	schemaObject.version = schemaObject.version || getVersion(schemaObject);
	const schemaAsString = JSON.stringify(schemaObject, null, 2);

	const uploadStream = new Readable();
	uploadStream.push(schemaAsString);
	uploadStream.push(null);

	// eslint-disable-next-line no-console
	console.log(`Deploying schema to ${bucketName}/${environment}/schema.json`);

	await s3Client
		.upload({
			Bucket: bucketName,
			Key: `${environment}/schema.json`,
			Body: uploadStream,
			ContentType: 'application/json',
		})
		.promise();
};

module.exports = { sendSchemaToS3 };

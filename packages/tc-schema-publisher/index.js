const crypto = require('crypto');
const AWS = require('aws-sdk');
const { Readable } = require('stream');

const s3Client = new AWS.S3({ region: 'eu-west-1' });

const getVersion = schemaObject => {
	const asString = JSON.stringify(schemaObject, null, 2);
	return crypto
		.createHash('md5')
		.update(asString)
		.digest('hex');
};

const sendSchemaToS3 = async (
	environment,
	bucketName = process.env.TREECREEPER_SCHEMA_BUCKET,
	schemaObject,
) => {
	schemaObject.version = schemaObject.version || getVersion(schemaObject);
	const schema = JSON.stringify(schemaObject, null, 2);

	const uploadStream = new Readable();
	uploadStream.push(schema);
	uploadStream.push(null);

	console.log(
		`Deploying schema to biz-ops-schema.${process.env.AWS_ACCOUNT_ID}/${environment}/schema.json`,
	);

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

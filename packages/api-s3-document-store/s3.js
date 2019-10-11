const { S3 } = require('aws-sdk');

const s3BucketPrefixCode = 'biz-ops-documents';
const { AWS_ACCESS_KEY, AWS_SECRET_ACCESS_KEY, AWS_ACCOUNT_ID } = process.env;

const createS3Instance = ({ accessKeyId, secretAccessKey }) =>
	new S3({ accessKeyId, secretAccessKey });

const getBucketName = () => `${s3BucketPrefixCode}.${AWS_ACCOUNT_ID}`;

module.exports = {
	// Typically use default instance
	defaultS3Instance: createS3Instance({
		accessKeyId: AWS_ACCESS_KEY,
		secretAccessKey: AWS_SECRET_ACCESS_KEY,
	}),
	// Or you can use with custom configurations
	createS3Instance,

	getBucketName,
	s3BucketPrefixCode,
};

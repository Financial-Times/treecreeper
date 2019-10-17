const { S3 } = require('aws-sdk');

const { AWS_ACCESS_KEY, AWS_SECRET_ACCESS_KEY } = process.env;

const createS3Instance = ({ accessKeyId, secretAccessKey }) =>
	new S3({ accessKeyId, secretAccessKey });

module.exports = {
	// Typically use default instance
	defaultS3Instance: createS3Instance({
		accessKeyId: AWS_ACCESS_KEY,
		secretAccessKey: AWS_SECRET_ACCESS_KEY,
	}),
	// Or you can use with custom configurations
	createS3Instance,
};

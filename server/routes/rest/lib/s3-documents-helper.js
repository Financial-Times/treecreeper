const AWS = require('aws-sdk');
const { diff } = require('deep-diff');
const { logger } = require('../../../lib/request-context');

const s3BucketReal = () => {
	return new AWS.S3({
		accessKeyId: process.env.AWS_ACCESS_KEY,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	});
};

const s3BucketName = `${s3BucketName}.${process.env.AWS_ACCOUNT_ID}`;

const uploadToS3 = async (s3, params, requestType) => {
	try {
		const res = await s3.upload(params).promise();
		logger.info(res, `${requestType}: S3 Upload successful`);
	} catch (err) {
		logger.info(err, `${requestType}: S3 Upload failed`);
	}
};

const writeFileToS3 = async (
	nodeType,
	code,
	body,
	s3DocumentsBucket = s3BucketReal,
) => {
	const s3 = s3DocumentsBucket();
	const params = {
		Bucket: `${s3BucketName}.${process.env.AWS_ACCOUNT_ID}`,
		Key: `${nodeType}/${code}`,
		Body: JSON.stringify(body),
	};
	uploadToS3(s3, params, 'POST');
};

const patchS3file = async (
	nodeType,
	code,
	body,
	s3DocumentsBucket = s3BucketReal,
) => {
	const s3 = s3DocumentsBucket();
	const params = {
		Bucket: `${s3BucketName}.${process.env.AWS_ACCOUNT_ID}`,
		Key: `${nodeType}/${code}`,
	};
	try {
		const existingNode = await s3.getObject(params).promise();
		const existingBody = JSON.parse(existingNode.Body);
		if (diff(existingBody, body)) {
			const newBody = Object.assign(existingBody, body);
			uploadToS3(
				s3,
				Object.assign({ Body: JSON.stringify(newBody) }, params),
				'PATCH',
			);
		} else {
			logger.info('PATCH: No S3 Upload as file is unchanged');
		}
	} catch (err) {
		uploadToS3(
			s3,
			Object.assign({ Body: JSON.stringify(body) }, params),
			'PATCH',
		);
	}
};

const deleteFileFromS3 = async (
	nodeType,
	code,
	s3DocumentsBucket = s3BucketReal,
) => {
	const s3 = s3DocumentsBucket();

	const params = {
		Bucket: `${s3BucketName}.${process.env.AWS_ACCOUNT_ID}`,
		Key: `${nodeType}/${code}`,
	};

	try {
		const res = await s3.deleteObject(params).promise();
		logger.info(res, 'DELETE: S3 Delete successful');
	} catch (err) {
		logger.info(err, 'DELETE: S3 Delete failed');
	}
};

module.exports = {
	writeFileToS3,
	patchS3file,
	deleteFileFromS3,
};

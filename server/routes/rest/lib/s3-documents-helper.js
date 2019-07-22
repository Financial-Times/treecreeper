const AWS = require('aws-sdk');
const { diff } = require('deep-diff');
const { logger } = require('../../../lib/request-context');

const s3BucketReal = () => {
	return new AWS.S3({
		accessKeyId: process.env.AWS_ACCESS_KEY,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	});
};

const s3BucketName = 'biz-ops-documents';

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
	try {
		const res = await s3.upload(params).promise();
		logger.info(res, 'POST: S3 Upload successful');
	} catch (err) {
		logger.info(err, 'POST: S3 Upload failed');
	}
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
			try {
				const res = await s3
					.upload(
						Object.assign(
							{ Body: JSON.stringify(newBody) },
							params,
						),
					)
					.promise();
				logger.info(
					res,
					'PATCH: S3 Upload successful - file has been updated',
				);
			} catch (uploadErr) {
				logger.info(
					uploadErr,
					'PATCH: S3 Upload failed - could not update file',
				);
			}
		} else {
			logger.info('PATCH: No S3 Upload as file is unchanged');
		}
	} catch (err) {
		try {
			const res = await s3
				.upload(Object.assign({ Body: JSON.stringify(body) }, params))
				.promise();
			logger.info(
				res,
				'PATCH: S3 Upload successful - file has been created',
			);
		} catch (uploadErr) {
			logger.info(
				uploadErr,
				'PATCH: S3 Upload failed - could not create file',
			);
		}
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

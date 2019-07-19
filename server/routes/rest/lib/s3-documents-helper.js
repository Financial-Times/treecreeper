const AWS = require('aws-sdk');
const { diff } = require('deep-diff');

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
		await s3.upload(params).promise();
		console.log('post');
	} catch (err) {
		console.log(err);
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
				await s3
					.upload(
						Object.assign(
							{ Body: JSON.stringify(newBody) },
							params,
						),
					)
					.promise();
				console.log('patch, node updated');
			} catch (uploadErr) {
				console.log(uploadErr);
			}
		} else {
			console.log('patch, node is unchanged');
		}
	} catch (err) {
		console.log(err);

		try {
			await s3
				.upload(Object.assign({ Body: JSON.stringify(body) }, params))
				.promise();
			console.log("patch, node doesn't exist");
		} catch (uploadErr) {
			console.log(uploadErr);
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
		await s3.deleteObject(params).promise();
		console.log('delete');
	} catch (err) {
		console.log(err);
	}
};

module.exports = {
	writeFileToS3,
	patchS3file,
	deleteFileFromS3,
};

const { logger } = require('@financial-times/tc-api-express-logger');

const s3Get = async ({ s3Instance, bucketName, type, code, versionMarker }) => {
	const params = {
		Bucket: bucketName,
		Key: `${type}/${code}`,
	};
	if (versionMarker) {
		params.VersionId = versionMarker;
	}

	try {
		const node = await s3Instance.getObject(params).promise();
		const body = JSON.parse(node.Body);

		logger.info(
			{
				event: 'GET_S3_SUCCESS',
			},
			body,
		);
		return {
			body,
		};
	} catch (err) {
		if (err.code === 'NoSuchKey') {
			logger.info(
				{
					event: 'GET_S3_NOTFOUND',
				},
				params.Key,
			);
			return { body: {} };
		}
		logger.info(
			{
				event: 'GET_S3_FAILURE',
			},
			err,
			params.Key,
		);
		throw err;
	}
};

module.exports = {
	s3Get,
};

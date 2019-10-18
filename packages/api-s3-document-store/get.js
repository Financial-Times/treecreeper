const { logger } = require('../api-core/lib/request-context');

const s3Get = async ({
	s3Instance,
	bucketName,
	nodeType,
	code,
	versionMarker,
}) => {
	const params = {
		Bucket: bucketName,
		Key: `${nodeType}/${code}`,
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
			return {};
		}
		logger.info(
			{
				event: 'GET_S3_FAILURE',
			},
			err,
			params.Key,
		);
		throw new Error(err);
	}
};

module.exports = {
	s3Get,
};

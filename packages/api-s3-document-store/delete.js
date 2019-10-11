const { logger } = require('../api-core/lib/request-context');

const s3Delete = async ({
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
		params.versionId = versionMarker;
	}

	try {
		const response = await s3Instance.deleteObject(params).promise();
		logger.info(
			{
				event: `DELETE_S3_SUCCESS`,
			},
			response,
			'DELETE: S3 Delete successful',
		);
		return {
			versionMarker: response.VersionId,
		};
	} catch (err) {
		logger.info(
			{
				event: `DELETE_S3_FAILURE`,
			},
			err,
			'DELETE: S3 Delete failed',
		);
	}
	return {
		versionMarker: null,
	};
};

module.exports = {
	s3Delete,
};

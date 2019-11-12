const { logger } = require('@financial-times/tc-api-express-logger');
const { undo } = require('./undo');

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
		params.VersionId = versionMarker;
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
			undo: undo({
				s3Instance,
				bucketName,
				nodeType,
				code,
				versionMarker: response.VersionId,
				undoType: 'DELETE',
			}),
		};
	} catch (err) {
		logger.info(
			{
				event: `DELETE_S3_FAILURE`,
			},
			err,
			'DELETE: S3 Delete failed',
		);
		throw err;
	}
};

module.exports = {
	s3Delete,
};
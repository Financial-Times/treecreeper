const { undo } = require('./undo');
const { getLogger } = require('../api-express-logger');

const s3Delete = async ({
	s3Instance,
	bucketName,
	nodeType,
	code,
	versionMarker,
	logger = getLogger(),
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
				logger,
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

const composeS3Delete = (composeOptions = {}) => {
	const { s3Instance, bucketName, logger } = composeOptions;

	return {
		...composeOptions,
		delete: async (nodeType, code, versionMarker) =>
			s3Delete({
				s3Instance,
				bucketName,
				nodeType,
				code,
				versionMarker,
				logger,
			}),
	};
};

module.exports = {
	s3Delete,
	composeS3Delete,
};

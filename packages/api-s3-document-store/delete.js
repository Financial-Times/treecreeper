const { logger } = require('../api-core/lib/request-context');
const { s3Get } = require('./get');
const { undoDelete } = require('./undo');

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

	// we need to store body before delete in order to undo it
	const { body } = await s3Get({
		s3Instance,
		bucketName,
		nodeType,
		code,
		versionMarker,
	});

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
			undo: undoDelete({
				s3Instance,
				bucketName,
				nodeType,
				code,
				body,
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
	}
	return {
		versionMarker: null,
	};
};

module.exports = {
	s3Delete,
};

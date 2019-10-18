const { logger } = require('../api-core/lib/request-context');

const undo = ({
	s3Instance,
	bucketName,
	nodeType,
	code,
	versionMarker,
	undoType = 'POST',
}) => async () => {
	if (!versionMarker) {
		logger.info(
			{
				event: `${undoType}_UNDO_NOACTION`,
			},
			'UNDO no action becauce versionMarker is not provided',
		);
		return {};
	}

	const params = {
		Bucket: bucketName,
		Key: `${nodeType}/${code}`,
		VersionId: versionMarker,
	};

	logger.info({
		event: `${undoType}_UNDO_S3_VERSION`,
		params,
	});

	try {
		const response = await s3Instance.deleteObject(params).promise();
		logger.info(
			{
				event: `${undoType}_UNDO_S3_SUCCESS`,
			},
			response,
			`UNDO_${undoType}: Undo success`,
		);
		return {
			versionMarker: response.VersionId,
		};
	} catch (err) {
		const message = `UNDO_${undoType}: Undo fail`;
		logger.error(
			{
				event: `${undoType}_UNDO_S3_FAILURE`,
			},
			err,
			message,
		);
		throw new Error(err);
	}
};

module.exports = {
	undo,
};

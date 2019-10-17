const { logger } = require('../api-core/lib/request-context');

const undo = async (s3Instance, undoType, params) => {
	logger.info({
		event: `${undoType}_UNDO_S3_VERSION`,
		params,
	});

	try {
		const response =
			undoType === 'DELETE'
				? await s3Instance.upload(params).promise()
				: await s3Instance.deleteObject(params).promise();
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
		logger.info(
			{
				event: `${undoType}_UNDO_S3_FAILURE`,
			},
			err,
			message,
		);
		throw new Error(err);
	}
};

const undoCreate = ({
	s3Instance,
	bucketName,
	nodeType,
	code,
	versionMarker,
	undoType = 'POST',
}) => async () =>
	undo(s3Instance, undoType, {
		Bucket: bucketName,
		Key: `${nodeType}/${code}`,
		VersionId: versionMarker,
	});

const undoDelete = ({
	s3Instance,
	bucketName,
	nodeType,
	code,
	body,
}) => async () =>
	undo(s3Instance, 'DELETE', {
		Bucket: bucketName,
		Key: `${nodeType}/${code}`,
		Body: JSON.stringify(body),
	});

module.exports = {
	undoCreate,
	undoDelete,
};

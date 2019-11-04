const { undo } = require('./undo');

const s3Delete = async ({
	s3Instance,
	bucketName,
	nodeType,
	code,
	versionMarker,
	logger,
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

const composeS3Delete = ({ s3Instance, bucketName, logger }) => options => ({
	...options,
	delete: async (nodeType, code, versionMarker) =>
		s3Delete({
			s3Instance,
			bucketName,
			nodeType,
			code,
			versionMarker,
			logger,
		}),
});

module.exports = {
	s3Delete,
	composeS3Delete,
};

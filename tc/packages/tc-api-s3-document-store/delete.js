const { logger } = require('@financial-times/tc-api-express-logger');
const { undo } = require('./undo');

const s3Delete = async ({ s3Instance, bucketName, type, code }) => {
	const params = {
		Bucket: bucketName,
		Key: `${type}/${code}`,
	};

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
				type,
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

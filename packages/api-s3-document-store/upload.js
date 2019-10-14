const { logger } = require('../api-core/lib/request-context');

const upload = async ({ s3Instance, params, requestType }) => {
	try {
		const response = await s3Instance.upload(params).promise();
		logger.info(
			{
				event: `${requestType}_S3_SUCCESS`,
			},
			response,
			`${requestType}: S3 Upload successful`,
		);
		return response.VersionId;
	} catch (err) {
		logger.info(
			{
				event: `${requestType}_S3_FAILURE`,
			},
			err,
			`${requestType}: S3 Upload failed`,
		);
	}
	return false;
};

module.exports = {
	upload,
};

const { upload } = require('./upload');
const { undo } = require('./undo');
const { getLogger } = require('../api-express-logger');

const s3Post = async ({
	s3Instance,
	bucketName,
	nodeType,
	code,
	body,
	logger = getLogger(),
}) => {
	const params = {
		Bucket: bucketName,
		Key: `${nodeType}/${code}`,
		Body: JSON.stringify(body),
		ContentType: 'application/json',
	};

	const versionId = await upload({
		s3Instance,
		params,
		requestType: 'POST',
		logger,
	});

	return {
		versionMarker: versionId,
		body,
		undo: undo({
			s3Instance,
			bucketName,
			nodeType,
			code,
			versionMarker: versionId,
			logger,
		}),
	};
};

const composeS3Post = (composeOptions = {}) => {
	const { s3Instance, bucketName, logger } = composeOptions;

	return {
		...composeOptions,
		post: async (nodeType, code, body) =>
			s3Post({
				s3Instance,
				bucketName,
				nodeType,
				code,
				body,
				logger,
			}),
	};
};

module.exports = {
	s3Post,
	composeS3Post,
};

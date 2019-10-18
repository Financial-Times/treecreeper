const { upload } = require('./upload');
const { undo } = require('./undo');

const s3Post = async ({ s3Instance, bucketName, nodeType, code, body }) => {
	const params = {
		Bucket: bucketName,
		Key: `${nodeType}/${code}`,
		Body: JSON.stringify(body),
	};

	const versionId = await upload({
		s3Instance,
		params,
		requestType: 'POST',
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
		}),
	};
};

module.exports = {
	s3Post,
};

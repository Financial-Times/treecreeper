const { upload } = require('./upload');

const post = async ({ s3Instance, bucketName, nodeType, code, body }) => {
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
	};
};

module.exports = {
	post,
};

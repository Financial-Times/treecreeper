const { diff } = require('deep-diff');
const { upload } = require('./upload');
const { s3Get } = require('./get');

const s3Patch = async ({ s3Instance, bucketName, nodeType, code, body }) => {
	const params = {
		Bucket: bucketName,
		Key: `${nodeType}/${code}`,
	};
	const { body: existingBody } = await s3Get({
		s3Instance,
		bucketName,
		nodeType,
		code,
	});

	// If PATCHing body is completely same with existing body,
	// return existing body without upload - won't create new version
	if (!diff(existingBody, body)) {
		return {
			body: existingBody,
		};
	}

	const newBodyDocument = Object.assign(existingBody, body);
	const versionId = await upload({
		s3Instance,
		params: Object.assign(params, {
			Body: JSON.stringify(newBodyDocument),
		}),
		requestType: 'PATCH',
	});
	return {
		versionMarker: versionId,
		body: newBodyDocument,
	};
};

module.exports = {
	s3Patch,
};

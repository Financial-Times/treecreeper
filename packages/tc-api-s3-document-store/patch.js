const { diff } = require('deep-diff');
const { logger } = require('@financial-times/tc-api-express-logger');
const { upload } = require('./upload');
const { undo } = require('./undo');
const { s3Get } = require('./get');

const s3Patch = async ({ s3Instance, bucketName, type, code, body }) => {
	const { body: existingBody } = await s3Get({
		s3Instance,
		bucketName,
		type,
		code,
	});

	// If PATCHing body is completely same with existing body,
	// return existing body without upload - won't create new version
	if (!diff(existingBody, body)) {
		logger.info(
			{
				event: 'PATCH_S3_NOACTION',
			},
			'Patch: object is same',
		);
		return {
			body: existingBody,
		};
	}

	const newBodyDocument = Object.assign(existingBody, body);
	const params = {
		Bucket: bucketName,
		Key: `${type}/${code}`,
		Body: JSON.stringify(newBodyDocument),
		ContentType: 'application/json',
	};
	const versionId = await upload({
		s3Instance,
		params,
		requestType: 'PATCH',
	});
	return {
		versionMarker: versionId,
		body: newBodyDocument,
		undo: undo({
			s3Instance,
			bucketName,
			type,
			code,
			versionMarker: versionId,
			undoType: 'PATCH',
		}),
	};
};

module.exports = {
	s3Patch,
};

const { diff } = require('deep-diff');
const { logger } = require('../api-core/lib/request-context');
const { upload } = require('./upload');
const { undo } = require('./undo');
const { s3Get } = require('./get');

const s3Patch = async ({ s3Instance, bucketName, nodeType, code, body }) => {
	const { body: existingBody } = await s3Get({
		s3Instance,
		bucketName,
		nodeType,
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
		Key: `${nodeType}/${code}`,
		Body: JSON.stringify(newBodyDocument),
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
			nodeType,
			code,
			versionMarker: versionId,
			undoType: 'PATCH',
		}),
	};
};

module.exports = {
	s3Patch,
};

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
	const changedProperties = Object.keys(body).filter(
		// check that at least one has a value to avoid e.g. null !== undefined causing
		// an unnecessary write (the api will send nulls sometimes, but the json object will
		// contain undefineds)
		key =>
			(body[key] || existingBody[key]) && body[key] !== existingBody[key],
	);

	// If PATCHing body is completely same with existing body,
	// return existing body without upload - won't create new version
	if (!changedProperties.length) {
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

	const newBodyWithoutEmpty = Object.fromEntries(
		Object.entries(newBodyDocument).filter(([, value]) => !!value),
	);

	const params = {
		Bucket: bucketName,
		Key: `${type}/${code}`,
		Body: JSON.stringify(newBodyWithoutEmpty),
		ContentType: 'application/json',
	};
	const versionId = await upload({
		s3Instance,
		params,
		requestType: 'PATCH',
	});
	return {
		versionMarker: versionId,
		body: newBodyWithoutEmpty,
		updatedProperties: changedProperties,
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

const _isEmpty = require('lodash.isempty');
const { logger } = require('../api-core/lib/request-context');
const { s3Get } = require('./get');
const { s3Delete } = require('./delete');
const { s3Post } = require('./post');
const { diffProperties } = require('./diff');

const s3Merge = async ({
	s3Instance,
	bucketName,
	nodeType,
	sourceCode,
	destinationCode,
}) => {
	const [
		{ body: sourceNodeBody },
		{ body: destinationNodeBody },
	] = await Promise.all([
		s3Get({ s3Instance, bucketName, nodeType, code: sourceCode }),
		s3Get({ s3Instance, bucketName, nodeType, code: destinationCode }),
	]);
	// If the source node has no document properties/does not exist
	// in s3, take no action and return false in place of version ids
	if (_isEmpty(sourceNodeBody)) {
		logger.info(
			{
				event: 'MERGE_S3_NOACTION',
			},
			'Merge: Source object is empty',
		);
		return {};
	}

	const writeProperties = diffProperties(sourceNodeBody, destinationNodeBody);

	Object.keys(sourceNodeBody).forEach(name => {
		if (name in destinationNodeBody) {
			delete writeProperties[name];
		}
	});

	const noPropertiesToWrite = _isEmpty(writeProperties);

	const [deletedObject, postedObject] = await Promise.all([
		s3Delete({ s3Instance, bucketName, nodeType, code: sourceCode }),
		!noPropertiesToWrite
			? s3Post({
					s3Instance,
					bucketName,
					nodeType,
					code: destinationCode,
					// We always assign merge values to empty object in order to avoid side-effect to destinationNodeBody unexpectedly.
					body: Object.assign(
						{},
						destinationNodeBody,
						writeProperties,
					),
			  })
			: {},
	]);

	const {
		versionMarker: deletedVersionId,
		undo: undoDelete = async () => ({ versionMarker: null }),
	} = deletedObject;
	const {
		versionMarker: postedVersionId,
		undo: undoPost = async () => ({ versionMarker: null }),
	} = postedObject;

	// Both of delete source version and post destination version fails
	if (!deletedVersionId && !postedVersionId) {
		const message = 'MERGE FAILED: Write and delete failed in S3';
		logger.info(
			{
				event: 'MERGE_S3_FAILURE',
			},
			message,
		);
		throw new Error(message);
	}

	// post destination version success, but delete source version fails
	if (!deletedVersionId) {
		// Then delete posted version
		await undoPost();
		const message = 'MERGE FAILED: Delete failed in S3';
		logger.info(
			{
				event: 'MERGE_S3_FAILURE',
			},
			message,
		);
		throw new Error(message);
	}

	// delete source version success, but post destination version fails and should write new body
	if (!postedVersionId && !noPropertiesToWrite) {
		// Then we need to revert deleted source body
		await undoDelete();
		const message = 'MERGE FAILED: Write failed in S3';
		logger.info(
			{
				event: 'MERGE_S3_FAILURE',
			},
			message,
		);
		throw new Error(message);
	}

	return {
		versionMarker: postedVersionId,
		siblingVersionMarker: deletedVersionId,
		// We always assign merge values to empty object in order to avoid side-effect to destinationNodeBody unexpectedly.
		body: Object.assign({}, destinationNodeBody, sourceNodeBody),

		// On undo merge, we have to delete both of posted destination version and deleted source version
		undo: async () => {
			// delete destination post version
			const { versionMarker } = await undoPost();
			// revert deleted source version
			const { versionMarker: siblingVersionMarker } = await undoDelete();
			return {
				versionMarker,
				siblingVersionMarker,
			};
		},
	};
};

module.exports = {
	s3Merge,
};

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

	// s3Post will throw error, therefore we should trap it and prevent to raise error for undoing
	const postDestinationBody = async () => {
		if (noPropertiesToWrite) {
			return {};
		}
		try {
			return await s3Post({
				s3Instance,
				bucketName,
				nodeType,
				code: destinationCode,
				// We always assign merge values to empty object in order to avoid side-effect to destinationNodeBody unexpectedly.
				body: Object.assign({}, destinationNodeBody, writeProperties),
			});
		} catch (err) {
			return {};
		}
	};

	const [
		{
			versionMarker: deletedVersionId,
			undo: undoDelete = async () => ({ versionMarker: null }),
		},
		{
			versionMarker: postedVersionId,
			undo: undoPost = async () => ({ versionMarker: null }),
		},
	] = await Promise.all([
		s3Delete({ s3Instance, bucketName, nodeType, code: sourceCode }),
		postDestinationBody(),
	]);

	const undoAndRaiseEror = async message => {
		logger.error(
			{
				event: 'MERGE_S3_FAILURE',
				deletedVersionId,
				postedVersionId,
			},
			message,
		);
		await Promise.all([undoPost(), undoDelete()]);
		throw new Error(message);
	};

	// Both of delete source version and post destination version fails
	if (!deletedVersionId && !postedVersionId) {
		await undoAndRaiseEror('MERGE FAILED: Write and delete failed in S3');
	}

	// post destination version success, but delete source version fails
	if (!deletedVersionId) {
		await undoAndRaiseEror('MERGE FAILED: Delete failed in S3');
	}

	// delete source version success, but post destination version fails and should write new body
	if (!postedVersionId && !noPropertiesToWrite) {
		await undoAndRaiseEror('MERGE FAILED: Write failed in S3');
	}

	return {
		versionMarker: postedVersionId,
		siblingVersionMarker: deletedVersionId,
		// We always assign merge values to empty object in order to avoid side-effect to destinationNodeBody unexpectedly.
		body: Object.assign({}, destinationNodeBody, sourceNodeBody),

		// On undo merge, we have to delete both of posted destination version and deleted source version
		undo: async () => {
			const [
				// delete destination post version
				{ versionMarker },
				// revert deleted source version
				{ versionMarker: siblingVersionMarker },
			] = await Promise.all([undoPost(), undoDelete()]);

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

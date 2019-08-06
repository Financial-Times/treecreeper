const { stripIndents } = require('common-tags');
const { validateParams } = require('../../lib/validation');
const { preflightChecks } = require('../../lib/error-handling');
const { executeQuery } = require('../../lib/neo4j-model');
const { logNodeDeletion } = require('../../../../lib/log-to-kinesis');
const { getNodeWithRelationships } = require('../../lib/read-helpers');
const S3DocumentsHelper = require('../../lib/s3-documents-helper');

const s3DocumentsHelper = new S3DocumentsHelper();
const { logger } = require('../../../../lib/request-context');

module.exports = async input => {
	validateParams(input);
	const { nodeType, code } = input;

	const existingRecord = await getNodeWithRelationships(nodeType, code);

	preflightChecks.bailOnMissingNode({
		result: existingRecord,
		nodeType,
		code,
		status: 404,
	});
	preflightChecks.bailOnAttachedNode({
		record: existingRecord.toApiV2(nodeType),
		nodeType,
		code,
	});

	const query = stripIndents`
	MATCH (node:${nodeType} {code: $code})
	DELETE node
	`;

	// Prefer simplicity/readabilitiy over optimisation here -
	// S3 and neo4j deletes are in series instead of parallel
	// so we don't have to bother thinking about rolling back actions for
	// all the different possible combinations of successes/failures
	// in different orders. S3 requests are more reliable than neo4j
	// requests so try s3 first, and roll back S3 if neo4j delete fails.
	const deleteMarker = await s3DocumentsHelper.deleteFileFromS3(
		nodeType,
		code,
	);
	try {
		await executeQuery(query, { code });
	} catch (err) {
		logger.info(
			err,
			'DELETE: Neo4j Delete unsuccessful, attempting to rollback S3 delete',
		);
		s3DocumentsHelper.deleteFileFromS3(nodeType, code, deleteMarker);
		throw new Error(err);
	}

	logNodeDeletion(existingRecord.getNode());

	return { status: 204 };
};

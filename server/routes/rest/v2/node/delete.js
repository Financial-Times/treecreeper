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

	await s3DocumentsHelper.deleteFileFromS3(nodeType, code);
	try {
		await executeQuery(query, { code });
	} catch (err) {
		logger.info(
			err,
			'DELETE: Neo4j Delete unsuccessful, attempting to rollback S3 delete',
		);
		s3DocumentsHelper.restoreToPreviousVersion(nodeType, code);
		throw new Error(err);
	}

	logNodeDeletion(existingRecord.getNode());

	return { status: 204 };
};

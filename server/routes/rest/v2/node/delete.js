const { stripIndents } = require('common-tags');
const AWS = require('aws-sdk');
const { validateParams } = require('../../lib/validation');
const { preflightChecks } = require('../../lib/error-handling');
const { executeQuery } = require('../../lib/neo4j-model');
const { logNodeDeletion } = require('../../../../lib/log-to-kinesis');
const { getNodeWithRelationships } = require('../../lib/read-helpers');

module.exports = async input => {
	validateParams(input);
	const { nodeType, code } = input;

	const existingRecord = await getNodeWithRelationships(nodeType, code);

	const s3 = new AWS.S3({
		accessKeyId: process.env.AWS_ACCESS_KEY,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	});

	const params = {
		Bucket: 'biz-ops-documents.510688331160',
		Key: `${nodeType}/${code}`,
	};

	s3.deleteObject(params, function(err, data) {
		if (err) {
			console.log(err, err.stack);
		} else {
			console.log(data);
			console.log('delete');
		}
	});

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

	await executeQuery(query, { code });
	logNodeDeletion(existingRecord.getNode());

	return { status: 204 };
};

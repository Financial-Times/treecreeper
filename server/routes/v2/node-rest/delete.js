const { validateParams } = require('../../lib/rest-input-helpers');
const { stripIndents } = require('common-tags');
const { preflightChecks } = require('../../lib/errors');

const { executeQuery } = require('../../../data/db-connection');
const { logNodeDeletion } = require('../../lib/log-to-kinesis');
const { getNodeWithRelationships } = require('../../../data/canned-queries');

module.exports = async input => {
	validateParams(input);
	const { clientId, requestId, nodeType, code } = input;

	const existingRecord = await getNodeWithRelationships(nodeType, code);

	preflightChecks.bailOnMissingNode({
		result: existingRecord,
		nodeType,
		code,
		status: 404
	});
	preflightChecks.bailOnAttachedNode({
		result: existingRecord,
		nodeType,
		code
	});

	const query = stripIndents`
	MATCH (node:${nodeType} {code: $code})
	DELETE node
	`;

	await executeQuery(query, { code, clientId, requestId });
	logNodeDeletion(existingRecord.records[0].get('node'));

	return { status: 204 };
};

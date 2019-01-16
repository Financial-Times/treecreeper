const { stripIndents } = require('common-tags');
const { validateParams } = require('../../../lib/rest-input-helpers');
const { preflightChecks } = require('../../../lib/error-handling');
const { executeQuery } = require('../../../data/db-connection');
const { logNodeDeletion } = require('../../../lib/log-to-kinesis');
const { getNodeWithRelationships } = require('../../../data/cypher-helpers');

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
		result: existingRecord,
		nodeType,
		code,
	});

	const query = stripIndents`
	MATCH (node:${nodeType} {code: $code})
	DELETE node
	`;

	await executeQuery(query, { code });
	logNodeDeletion(existingRecord.records[0].get('node'));

	return { status: 204 };
};

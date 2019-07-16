const { validateParams } = require('../../lib/validation');
const { preflightChecks } = require('../../lib/error-handling');
const { getNodeWithRelationships } = require('../../lib/read-helpers');

const read = async input => {
	validateParams(input);
	const { nodeType, code } = input;

	const result = await getNodeWithRelationships(nodeType, code);
	preflightChecks.bailOnMissingNode({ result, nodeType, code, status: 404 });
	return result.toApiV2(nodeType);
};

module.exports = read;

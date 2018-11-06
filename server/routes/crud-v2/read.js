const { validateParams } = require('../lib/input-helpers');
const { preflightChecks } = require('../lib/errors');
const { constructNode: constructOutput } = require('../lib/construct-output');
const { getNodeWithRelationships } = require('../data/canned-queries');

const read = async input => {
	validateParams(input);
	const { nodeType, code } = input;

	const result = await getNodeWithRelationships(nodeType, code);

	preflightChecks.bailOnMissingNode({ result, nodeType, code, status: 404 });
	return constructOutput(nodeType, result);
};

module.exports = read;

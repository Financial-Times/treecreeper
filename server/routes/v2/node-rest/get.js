const { validateParams } = require('../../../lib/rest-input-helpers');
const { preflightChecks } = require('../../../lib/error-handling');
const constructOutput = require('../../../data/construct-output');
const { getNodeWithRelationships } = require('../../../data/cypher-helpers');

const read = async input => {
	validateParams(input);
	const { nodeType, code } = input;

	const result = await getNodeWithRelationships(nodeType, code);

	preflightChecks.bailOnMissingNode({ result, nodeType, code, status: 404 });
	return constructOutput(nodeType, result);
};

module.exports = read;

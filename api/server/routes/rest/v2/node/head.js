const { validateParams } = require('../../lib/validation');
const { preflightChecks } = require('../../lib/error-handling');
const { getNode } = require('../../lib/read-helpers');

const read = async input => {
	validateParams(input);
	const { nodeType, code } = input;
	const result = await getNode(nodeType, code);
	preflightChecks.bailOnMissingNode({ result, nodeType, code, status: 404 });
	return { status: 200 };
};

module.exports = read;

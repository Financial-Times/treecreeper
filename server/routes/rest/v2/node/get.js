const { validateParams } = require('../../lib/validation');
const { preflightChecks } = require('../../lib/error-handling');
const { getNodeWithRelationships } = require('../../lib/read-helpers');
const S3DocumentsHelper = require('../../lib/s3-documents-helper');

const s3DocumentsHelper = new S3DocumentsHelper();

const read = async input => {
	validateParams(input);
	const { nodeType, code } = input;
	const result = await getNodeWithRelationships(nodeType, code);
	const s3Result = await s3DocumentsHelper.getNode(nodeType, code);
	preflightChecks.bailOnMissingNode({ result, nodeType, code, status: 404 });
	const responseData = result.toApiV2(nodeType);
	Object.assign(responseData, s3Result);
	return responseData;
};

module.exports = read;

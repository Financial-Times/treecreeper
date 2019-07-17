const { validateParams, validatePayload } = require('../../lib/validation');
const {
	dbErrorHandlers,
	preflightChecks,
} = require('../../lib/error-handling');
const { createNewNode } = require('../../lib/write-helpers');
const { writeFileToS3 } = require('../../lib/s3-documents-helper');

const create = async input => {
	validateParams(input);
	validatePayload(input);

	const { nodeType, code, clientId, query, body } = input;

	preflightChecks.handleSimultaneousWriteAndDelete(body);

	writeFileToS3(nodeType, code, body);

	try {
		return await createNewNode({
			nodeType,
			code,
			clientId,
			query,
			body,
			method: 'POST',
		});
	} catch (err) {
		dbErrorHandlers.duplicateNode(err, nodeType, code);
		dbErrorHandlers.nodeUpsert(err);
		throw err;
	}
};

module.exports = create;

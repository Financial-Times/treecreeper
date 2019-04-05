const { validateParams, validatePayload } = require('../../../lib/validation');
const {
	dbErrorHandlers,
	preflightChecks,
} = require('../../../lib/error-handling');
const { createNewNode } = require('../helpers');

const create = async input => {
	validateParams(input);
	validatePayload(input);

	const { nodeType, code, clientId, query, body } = input;

	preflightChecks.handleSimultaneousWriteAndDelete(body);

	try {
		return await createNewNode(
			nodeType,
			code,
			clientId,
			query,
			body,
			'POST',
		);
	} catch (err) {
		dbErrorHandlers.duplicateNode(err, nodeType, code);
		dbErrorHandlers.nodeUpsert(err);
		throw err;
	}
};

module.exports = create;

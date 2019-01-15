const inputHelpers = require('../../../lib/rest-input-helpers');
const { stripIndents } = require('common-tags');
const { dbErrorHandlers } = require('../../../lib/error-handling');
const executor = require('./_post-patch-executor');
const { metaPropertiesForCreate } = require('../../../data/cypher-helpers');

const create = async input => {
	inputHelpers.validateParams(input);
	inputHelpers.validatePayload(input);

	const {
		clientId,
		requestId,
		nodeType,
		code,
		clientUserId,
		query: { upsert }
	} = input;

	try {
		return await executor({
			parameters: {
				clientId,
				timestamp: new Date().toISOString(),
				requestId,
				code,
				clientUserId,
				properties: inputHelpers.getWriteProperties(nodeType, input.body, code)
			},
			queryParts: [
				stripIndents`CREATE (node:${nodeType} $properties)
					SET
					${metaPropertiesForCreate('node')}
				WITH node`
			],
			method: 'POST',
			upsert,
			nodeType,
			writeRelationships: inputHelpers.getWriteRelationships(
				nodeType,
				input.body
			)
		});
	} catch (err) {
		dbErrorHandlers.duplicateNode(err, nodeType, code);
		dbErrorHandlers.nodeUpsert(err);
		throw err;
	}
};

module.exports = create;

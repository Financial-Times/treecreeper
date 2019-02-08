const { stripIndents } = require('common-tags');
const inputHelpers = require('../../../lib/rest-input-helpers');
const { dbErrorHandlers } = require('../../../lib/error-handling');
const executor = require('./_post-patch-executor');
const { metaPropertiesForCreate } = require('../../../data/cypher-helpers');
const getLockedFields = require('../../../lib/get-locked-fields');

const create = async input => {
	inputHelpers.validateParams(input);
	inputHelpers.validatePayload(input);

	const {
		clientId,
		requestId,
		nodeType,
		code,
		clientUserId,
		query: { upsert, lockFields },
		body,
	} = input;

	try {
		const lockedFields = lockFields
			? getLockedFields(clientId, lockFields)
			: '';

		const properties = inputHelpers.getWriteProperties(
			nodeType,
			body,
			code,
		);

		const queryParts = [
			stripIndents`CREATE (node:${nodeType} $properties)
				SET ${metaPropertiesForCreate('node')}
			WITH node`,
		];

		return await executor({
			parameters: {
				clientId,
				timestamp: new Date().toISOString(),
				requestId,
				code,
				clientUserId,
				properties,
				lockedFields,
			},
			queryParts,
			method: 'POST',
			upsert,
			nodeType,
			writeRelationships: inputHelpers.getWriteRelationships(
				nodeType,
				body,
			),
		});
	} catch (err) {
		dbErrorHandlers.duplicateNode(err, nodeType, code);
		dbErrorHandlers.nodeUpsert(err);
		throw err;
	}
};

module.exports = create;

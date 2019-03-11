const { stripIndents } = require('common-tags');
const recordAnalysis = require('../../../data/record-analysis');
const { validateParams, validatePayload } = require('../../../lib/validation');
const { dbErrorHandlers } = require('../../../lib/error-handling');
const executor = require('./_post-patch-executor');
const { metaPropertiesForCreate } = require('../../../data/cypher-helpers');
const { constructNeo4jProperties } = require('../../../data/data-conversion');

const createNewNode = (nodeType, code, upsert, body, method) => {
	return executor({
		nodeType,
		code,
		method,
		upsert,
		isCreate: true,

		propertiesToCreate: constructNeo4jProperties({
			nodeType,
			newContent: body,
			code,
		}),
		relationshipsToCreate: recordAnalysis.diffRelationships({
			nodeType,
			newContent: body,
		}).addedRelationships,
		queryParts: [
			stripIndents`CREATE (node:${nodeType} $properties)
				SET ${metaPropertiesForCreate('node')}
			WITH node`,
		],
	});
};

const create = async input => {
	validateParams(input);
	validatePayload(input);

	const {
		nodeType,
		code,
		query: { upsert },
		body,
	} = input;

	try {
		return await createNewNode(nodeType, code, upsert, body, 'POST');
	} catch (err) {
		dbErrorHandlers.duplicateNode(err, nodeType, code);
		dbErrorHandlers.nodeUpsert(err);
		throw err;
	}
};

module.exports = create;

module.exports.createNewNode = createNewNode;

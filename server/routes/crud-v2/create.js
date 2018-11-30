const inputHelpers = require('../lib/input-helpers');
const { stripIndents } = require('common-tags');
const { dbErrorHandlers } = require('../lib/errors');
const { logNodeChanges } = require('../lib/log-to-kinesis');
const { metaAttributesForCreate } = require('../data/cypher-fragments');

const {
	getBatchedQueries,
	executeBatchOrSingle
} = require('../data/relationship-batcher');

const salesforceSync = require('../../lib/salesforce-sync');

const create = async input => {
	inputHelpers.validateParams(input);
	inputHelpers.validatePayload(input);

	const {
		clientId,
		requestId,
		nodeType,
		code,
		query: { upsert }
	} = input;

	try {
		// If the request creates a lot of relationships, more than one query
		// will need to be executed for perf reasons. These are the parameters
		// common to all those queries
		const baseParameters = {
			clientId,
			date: new Date().toUTCString(),
			requestId,
			code
		};

		// start building a large neo4j query
		// First step is to try to create the node, then pass it to the next
		// bit of the query
		const queryParts = [
			stripIndents`CREATE (node:${nodeType} $attributes)
				SET
				${metaAttributesForCreate('node')}
			WITH node`
		];

		const queries = getBatchedQueries({
			baseParameters,
			writeAttributes: inputHelpers.getWriteAttributes(
				nodeType,
				input.attributes,
				code
			),
			nodeType,
			upsert,
			writeRelationships: inputHelpers.getWriteRelationships(
				nodeType,
				input.attributes
			),
			initialQueryParts: queryParts
		});

		const { data, neo4jResponse } = await executeBatchOrSingle(
			queries,
			nodeType,
			code
		);

		// HACK: While salesforce also exists as a rival source of truth for Systems,
		// we sync with it here. Don't like it being in here as the api should be agnostic
		// in how it handles types, but a little hack in here feels preferable to managing
		// another update stream consumer, particularly while avoiding race conditions when
		// migrating from cmdb
		if (nodeType === 'System') {
			salesforceSync.setSalesforceIdForSystem({ node: data });
		}
		logNodeChanges({ newRecords: neo4jResponse.records });
		return data;
	} catch (err) {
		dbErrorHandlers.duplicateNode(err, nodeType, code);
		dbErrorHandlers.nodeUpsert(err);
		throw err;
	}
};

module.exports = create;

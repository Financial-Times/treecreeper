const {
	validateParams,
	categorizeAttributes
} = require('../lib/input-helpers');
const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const { dbErrorHandlers, preflightChecks } = require('../lib/errors');
const { constructNode: constructOutput } = require('../lib/construct-output');
const { getType } = require('@financial-times/biz-ops-schema');
const { logger } = require('../../lib/request-context');
const {
	metaAttributesForUpdate,
	metaAttributesForCreate,
	deleteRelationships: deleteRelationshipsFragment
} = require('../data/cypher-fragments');

const salesforceSync = require('../../lib/salesforce-sync');
const { getNodeWithRelationships } = require('../data/canned-queries');
const { logNodeChanges } = require('../lib/log-to-kinesis');
const {
	getBatchedQueries,
	executeBatchOrSingle
} = require('../data/relationship-batcher');

const toArray = it =>
	typeof it === 'undefined' ? undefined : Array.isArray(it) ? it : [it];

const arrDiff = (arr1, arr2) =>
	toArray(arr1).filter(item => !toArray(arr2).includes(item));

const entriesArrayToObject = arr =>
	arr.reduce((obj, [name, val]) => Object.assign(obj, { [name]: val }), {});

const nodeDiffer = (
	nodeType,
	existingNode = {},
	newNode = {},
	deleteAttributes = []
) => {
	const schema = getType(nodeType);
	return Object.entries(newNode)
		.filter(([propName]) => !schema.properties[propName].relationship)
		.filter(([propName, value]) => existingNode[propName] !== value)
		.map(([propName]) => propName)
		.concat(deleteAttributes.filter(name => name in existingNode));
};

const relationshipDiffer = (
	nodeType,
	existingRelationships = {},
	newRelationships = {},
	deleteRelationships,
	action
) => {
	const schema = getType(nodeType);
	const summary = Object.entries(newRelationships)
		.map(([relType, newCodes]) => {
			const isCardinalityOne = !schema.properties[relType].hasMany;
			if (isCardinalityOne && newCodes.length > 1) {
				throw httpErrors(400, `Can only have one ${relType}`);
			}
			const existingCodes = existingRelationships[relType];
			if (!existingCodes && newCodes.length) {
				return [relType, { added: newCodes }];
			}
			const newCodesOnly = arrDiff(newCodes, existingCodes);
			const existingCodesOnly = arrDiff(existingCodes, newCodes);
			if (newCodesOnly.length || existingCodesOnly.length) {
				return [
					relType,
					{
						added: newCodesOnly,
						removed:
							(action === 'replace' || isCardinalityOne) && existingCodesOnly
					}
				];
			}
			return [];
		})
		.filter(([relType]) => !!relType)
		.concat(
			deleteRelationships.map(relType => [
				relType,
				{
					removed: toArray(existingRelationships[relType])
				}
			])
		);

	return {
		addedRelationships: entriesArrayToObject(
			summary
				.filter(([, { added = [] }]) => added.length)
				.map(([relType, { added }]) => [relType, added])
		),
		removedRelationships: entriesArrayToObject(
			summary
				.filter(([, { removed = [] }]) => removed.length)
				.map(([relType, { removed }]) => [relType, removed])
		)
	};
};

const determineChanges = ({
	nodeType,
	writeAttributes,
	deleteAttributes,
	writeRelationships,
	deleteRelationships,
	existingRecord,
	relationshipAction
}) => {
	return Object.assign(
		{
			attributeChanges: nodeDiffer(
				nodeType,
				existingRecord,
				writeAttributes,
				deleteAttributes
			)
		},
		relationshipDiffer(
			nodeType,
			existingRecord,
			writeRelationships,
			deleteRelationships,
			relationshipAction
		)
	);
};

const update = async input => {
	validateParams(input);
	Object.assign(input, categorizeAttributes(input));

	// probably not needed any more as we validate higher up
	if (input.writeAttributes.code) {
		input.writeAttributes.code = input.code;
	}

	const {
		clientId,
		requestId,
		nodeType,
		code,
		writeAttributes,
		deleteAttributes,
		writeRelationships,
		deleteRelationships,
		query: { relationshipAction, upsert }
	} = input;

	try {
		if (
			Object.keys(writeRelationships).length + deleteRelationships.length >
			0
		) {
			preflightChecks.bailOnMissingRelationshipAction(relationshipAction);
		}

		const prefetch = await getNodeWithRelationships(nodeType, code);

		const existingRecord = prefetch.records.length
			? constructOutput(nodeType, prefetch)
			: {};

		const {
			attributeChanges,
			removedRelationships,
			addedRelationships
		} = determineChanges({
			nodeType,
			writeAttributes,
			deleteAttributes,
			writeRelationships,
			deleteRelationships,
			existingRecord,
			relationshipAction
		});

		if (
			!(
				attributeChanges.length +
				Object.keys(removedRelationships).length +
				Object.keys(addedRelationships).length
			)
		) {
			logger.info(
				{ event: 'SKIP_NODE_UPDATE' },
				'No changed properties or relationships - skipping node update'
			);
			return existingRecord;
		}

		// If the request creates a lot of relationships, more than one query
		// will need to be executed because a single large query that modifies too
		// many nodes at once hogs the database CPU. These are the parameters
		// common to all the batched queries
		const baseParameters = {
			clientId,
			date: new Date().toUTCString(),
			requestId,
			code
		};

		const queryParts = [
			stripIndents`MERGE (node:${nodeType} { code: $code })
					ON CREATE SET
						${metaAttributesForCreate('node')}
				`,

			attributeChanges.length
				? stripIndents`ON MATCH SET
						${metaAttributesForUpdate('node')}
					SET node += $attributes`
				: ''
		];
		queryParts.push(...deleteAttributes.map(attr => `REMOVE node.${attr}`));

		if (Object.keys(removedRelationships).length) {
			const schema = getType(nodeType);
			queryParts.push(
				...Object.entries(removedRelationships).map(([propName, codes]) => {
					const def = schema.properties[propName];
					const key = `Delete${def.relationship}${def.direction}${def.type}`;
					baseParameters[key] = codes;
					return `WITH node
				${deleteRelationshipsFragment(def, key)}
				`;
				})
			);
		}

		const queries = getBatchedQueries({
			baseParameters,
			writeAttributes,
			nodeType,
			upsert,
			writeRelationships: addedRelationships,
			initialQueryParts: queryParts
		});

		const { data, neo4jResponse } = await executeBatchOrSingle(
			queries,
			nodeType,
			code
		);

		logNodeChanges({
			newRecords: neo4jResponse.records,
			nodeType,
			removedRelationships
		});

		// HACK: While salesforce also exists as a rival source of truth for Systems,
		// we sync with it here. Don't like it being in here as the api should be agnostic
		// in how it handles types, but a little hack in here feels preferable to managing
		// another update stream consumer, particularly while avoiding race conditions when
		// migrating from cmdb
		if (nodeType === 'System') {
			salesforceSync.setSalesforceIdForSystem({ node: data });
		}

		return {
			data,
			status: data._createdByRequest === requestId ? 201 : 200
		};
	} catch (err) {
		dbErrorHandlers.nodeUpsert(err);
		throw err;
	}
};

module.exports = update;

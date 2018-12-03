const inputHelpers = require('../lib/input-helpers');
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

const entriesToObject = (map, [key, val]) => Object.assign(map, { [key]: val });

const avoidSimultaneousWriteAndDelete = (
	writeRelationships,
	deleteRelationships
) => {
	Object.entries(writeRelationships).forEach(([propName, codes]) => {
		if (
			deleteRelationships[propName] &&
			deleteRelationships[propName].some(code => codes.includes(code))
		) {
			throw httpErrors(
				400,
				'Trying to add and remove a relationship to a record at the same time'
			);
		}
	});
};

const relationshipDiffer = (
	nodeType,
	existingRelationships = {},
	attributes,
	action
) => {
	const newRelationships = inputHelpers.getWriteRelationships(
		nodeType,
		attributes
	);
	const deleteRelationships = inputHelpers.getDeleteRelationships(
		nodeType,
		attributes
	);

	avoidSimultaneousWriteAndDelete(newRelationships, deleteRelationships);
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
							action === 'replace' || isCardinalityOne
								? existingCodesOnly
								: undefined
					}
				];
			}
			return [];
		})
		.filter(([relType]) => !!relType)
		.concat(
			Object.entries(deleteRelationships).map(([relType, codes]) => [
				relType,
				{
					removed: codes
						? toArray(codes).filter(code =>
								(existingRelationships[relType] || []).includes(code)
						  )
						: toArray(existingRelationships[relType])
				}
			])
		);

	return {
		addedRelationships: summary
			.filter(([, { added = [] }]) => added.length)
			.map(([relType, { added }]) => [relType, added])
			.reduce(entriesToObject, {}),
		removedRelationships: summary
			.filter(([, { removed = [] }]) => removed.length)
			.map(([relType, { removed }]) => [relType, removed])
			.reduce(entriesToObject, {})
	};
};

const getChangedAttributes = (newAttributes, oldAttributes) => {
	return Object.entries(newAttributes)
		.filter(([propName, value]) => value !== oldAttributes[propName])
		.reduce(entriesToObject, {});
};

const getDeletedAttributeNames = (deletedAttributeNames, oldAttributes) =>
	deletedAttributeNames.filter(propName => propName in oldAttributes);

const update = async input => {
	inputHelpers.validateParams(input);
	inputHelpers.validatePayload(input);

	const {
		clientId,
		requestId,
		nodeType,
		code,
		query: { relationshipAction, upsert }
	} = input;

	if (inputHelpers.containsRelationshipData(nodeType, input.attributes)) {
		preflightChecks.bailOnMissingRelationshipAction(relationshipAction);
	}

	try {
		const prefetch = await getNodeWithRelationships(nodeType, code);

		const existingRecord = prefetch.records.length
			? constructOutput(nodeType, prefetch)
			: {};

		const writeAttributes = getChangedAttributes(
			inputHelpers.getWriteAttributes(nodeType, input.attributes, code),
			existingRecord
		);

		const deleteAttributeNames = getDeletedAttributeNames(
			inputHelpers.getDeleteAttributes(nodeType, input.attributes),
			existingRecord
		);

		const { removedRelationships, addedRelationships } = relationshipDiffer(
			nodeType,
			existingRecord,
			input.attributes,
			relationshipAction
		);

		const willModifyNode =
			Object.keys(writeAttributes).length + deleteAttributeNames.length;

		const willDeleteRelationships = !!Object.keys(removedRelationships).length;
		const willCreateRelationships = !!Object.keys(addedRelationships).length;
		const willModifyRelationships =
			willDeleteRelationships || willCreateRelationships;

		if (!willModifyNode && !willModifyRelationships) {
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
				`
		];

		if (willModifyNode) {
			queryParts.push(stripIndents`ON MATCH SET
						${metaAttributesForUpdate('node')}
					SET node += $attributes`);
		}

		queryParts.push(...deleteAttributeNames.map(attr => `REMOVE node.${attr}`));

		if (willDeleteRelationships) {
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
			code,
			willDeleteRelationships
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

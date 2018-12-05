const inputHelpers = require('../../lib/rest-input-helpers');
const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const { dbErrorHandlers, preflightChecks } = require('../../lib/errors');
const {
	constructNode: constructOutput
} = require('../../lib/construct-output');
const { getType } = require('@financial-times/biz-ops-schema');
const { logger } = require('../../../lib/request-context');
const {
	metaPropertiesForUpdate,
	metaPropertiesForCreate,
	deleteRelationships: deleteRelationshipsFragment
} = require('../../../data/cypher-fragments');

const salesforceSync = require('../../../lib/salesforce-sync');
const { getNodeWithRelationships } = require('../../../data/canned-queries');
const { logNodeChanges } = require('../../lib/log-to-kinesis');
const {
	getBatchedQueries,
	executeBatchOrSingle
} = require('../../lib/relationship-batcher');

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
	properties,
	action
) => {
	const newRelationships = inputHelpers.getWriteRelationships(
		nodeType,
		properties
	);
	const deleteRelationships = inputHelpers.getDeleteRelationships(
		nodeType,
		properties
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

const getChangedProperties = (newProperties, oldProperties) => {
	return Object.entries(newProperties)
		.filter(([propName, value]) => value !== oldProperties[propName])
		.reduce(entriesToObject, {});
};

const getDeletedPropertyNames = (deletedPropertyNames, oldProperties) =>
	deletedPropertyNames.filter(propName => propName in oldProperties);

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

	if (inputHelpers.containsRelationshipData(nodeType, input.body)) {
		preflightChecks.bailOnMissingRelationshipAction(relationshipAction);
	}

	try {
		const prefetch = await getNodeWithRelationships(nodeType, code);

		const existingRecord = prefetch.records.length
			? constructOutput(nodeType, prefetch)
			: {};

		const writeProperties = getChangedProperties(
			inputHelpers.getWriteProperties(nodeType, input.body, code),
			existingRecord
		);

		const deletePropertyNames = getDeletedPropertyNames(
			inputHelpers.getDeleteProperties(nodeType, input.body),
			existingRecord
		);

		const { removedRelationships, addedRelationships } = relationshipDiffer(
			nodeType,
			existingRecord,
			input.body,
			relationshipAction
		);

		const willModifyNode =
			Object.keys(writeProperties).length + deletePropertyNames.length;

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
						${metaPropertiesForCreate('node')}
				`
		];

		if (willModifyNode) {
			queryParts.push(stripIndents`ON MATCH SET
						${metaPropertiesForUpdate('node')}
					SET node += $properties`);
		}

		queryParts.push(...deletePropertyNames.map(attr => `REMOVE node.${attr}`));

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
			writeProperties,
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
			salesforceSync.setSalesforceIdForSystem(data);
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

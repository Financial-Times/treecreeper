const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const { getType } = require('@financial-times/biz-ops-schema');
const inputHelpers = require('../../../lib/rest-input-helpers');
const {
	dbErrorHandlers,
	preflightChecks,
} = require('../../../lib/error-handling');
const constructOutput = require('../../../data/construct-output');

const { logger } = require('../../../lib/request-context');
const cypherHelpers = require('../../../data/cypher-helpers');
const executor = require('./_post-patch-executor');

const toArray = it => {
	if (typeof it === 'undefined') {
		return;
	}
	return Array.isArray(it) ? it : [it];
};

const arrDiff = (arr1, arr2) =>
	toArray(arr1).filter(item => !toArray(arr2).includes(item));

const entriesToObject = (map, [key, val]) => Object.assign(map, { [key]: val });

const avoidSimultaneousWriteAndDelete = (
	writeRelationships,
	deleteRelationships,
) => {
	Object.entries(writeRelationships).forEach(([propName, codes]) => {
		if (
			deleteRelationships[propName] &&
			deleteRelationships[propName].some(code => codes.includes(code))
		) {
			throw httpErrors(
				400,
				'Trying to add and remove a relationship to a record at the same time',
			);
		}
	});
};

const relationshipDiffer = (
	nodeType,
	existingRelationships = {},
	properties,
	action,
) => {
	const newRelationships = inputHelpers.getWriteRelationships(
		nodeType,
		properties,
	);
	const deleteRelationships = inputHelpers.getDeleteRelationships(
		nodeType,
		properties,
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
								: undefined,
					},
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
								(existingRelationships[relType] || []).includes(
									code,
								),
						  )
						: toArray(existingRelationships[relType]),
				},
			]),
		);

	return {
		addedRelationships: summary
			.filter(([, { added = [] }]) => added.length)
			.map(([relType, { added }]) => [relType, added])
			.reduce(entriesToObject, {}),
		removedRelationships: summary
			.filter(([, { removed = [] }]) => removed.length)
			.map(([relType, { removed }]) => [relType, removed])
			.reduce(entriesToObject, {}),
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
		clientUserId,
		query: { relationshipAction, upsert },
	} = input;

	if (inputHelpers.containsRelationshipData(nodeType, input.body)) {
		preflightChecks.bailOnMissingRelationshipAction(relationshipAction);
	}

	try {
		const prefetch = await cypherHelpers.getNodeWithRelationships(
			nodeType,
			code,
		);

		const existingRecord = prefetch.records.length
			? constructOutput(nodeType, prefetch)
			: {};

		const writeProperties = getChangedProperties(
			inputHelpers.getWriteProperties(nodeType, input.body, code),
			existingRecord,
		);

		const deletePropertyNames = getDeletedPropertyNames(
			inputHelpers.getDeleteProperties(nodeType, input.body),
			existingRecord,
		);

		const { removedRelationships, addedRelationships } = relationshipDiffer(
			nodeType,
			existingRecord,
			input.body,
			relationshipAction,
		);

		const willModifyNode =
			Object.keys(writeProperties).length +
			deletePropertyNames.length +
			Object.keys(addedRelationships).length;

		const willDeleteRelationships = !!Object.keys(removedRelationships)
			.length;
		const willCreateRelationships = !!Object.keys(addedRelationships)
			.length;
		const willModifyRelationships =
			willDeleteRelationships || willCreateRelationships;

		if (!willModifyNode && !willModifyRelationships) {
			logger.info(
				{ event: 'SKIP_NODE_UPDATE' },
				'No changed properties or relationships - skipping node update',
			);
			return existingRecord;
		}

		// If the request creates a lot of relationships, more than one query
		// will need to be executed because a single large query that modifies too
		// many nodes at once hogs the database CPU. These are the parameters
		// common to all the batched queries
		const baseParameters = {
			clientId,
			clientUserId,
			timestamp: new Date().toISOString(),
			requestId,
			code,
		};

		const queryParts = [
			stripIndents`MERGE (node:${nodeType} { code: $code })
					ON CREATE SET
						${cypherHelpers.metaPropertiesForCreate('node')}
				`,
		];

		if (willModifyNode) {
			queryParts.push(stripIndents`ON MATCH SET
						${cypherHelpers.metaPropertiesForUpdate('node')}
					SET node += $properties`);
		}

		queryParts.push(
			...deletePropertyNames.map(attr => `REMOVE node.${attr}`),
		);

		if (willDeleteRelationships) {
			const schema = getType(nodeType);
			queryParts.push(
				...Object.entries(removedRelationships).map(
					([propName, codes]) => {
						const def = schema.properties[propName];
						const key = `Delete${def.relationship}${def.direction}${
							def.type
						}`;
						baseParameters[key] = codes;
						return `WITH node
				${cypherHelpers.deleteRelationships(def, key)}
				`;
					},
				),
			);
		}

		return await executor({
			parameters: Object.assign(
				{
					properties: writeProperties,
				},
				baseParameters,
			),
			queryParts,
			method: 'PATCH',
			upsert,
			nodeType,
			writeRelationships: addedRelationships,
			willDeleteRelationships,
			removedRelationships,
		});
	} catch (err) {
		dbErrorHandlers.nodeUpsert(err);
		throw err;
	}
};

module.exports = update;

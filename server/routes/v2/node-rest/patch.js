const { stripIndents } = require('common-tags');
const { validateParams, validatePayload } = require('../../../lib/validation');
const {
	dbErrorHandlers,
	preflightChecks,
} = require('../../../lib/error-handling');

const { logger } = require('../../../lib/request-context');
const cypherHelpers = require('../../../data/cypher-helpers');
const recordAnalysis = require('../../../data/record-analysis');
const {
	writeNode,
	prepareRelationshipDeletion,
	createNewNode,
} = require('../helpers');
const { constructNeo4jProperties } = require('../../../data/data-conversion');
const {
	mergeLockedFields,
	validateLockedFields,
} = require('../../../lib/locked-fields');

const update = async input => {
	validateParams(input);
	validatePayload(input);

	const { nodeType, code, clientId, query, body } = input;
	const { relationshipAction, upsert, lockFields, unlockFields } = query;

	if (recordAnalysis.containsRelationshipData(nodeType, body)) {
		preflightChecks.bailOnMissingRelationshipAction(relationshipAction);
		preflightChecks.handleSimultaneousWriteAndDelete(body);
	}

	try {
		const prefetch = await cypherHelpers.getNodeWithRelationships(
			nodeType,
			code,
		);

		const existingRecord = prefetch.toApiV2(nodeType);

		if (!existingRecord) {
			return await createNewNode(
				nodeType,
				code,
				clientId,
				query,
				body,
				'PATCH',
			);
		}

		const propertiesToModify = constructNeo4jProperties({
			nodeType,
			newContent: body,
			code,
			initialContent: existingRecord,
		});

		const existingLockedFields = existingRecord._lockedFields
			? JSON.parse(existingRecord._lockedFields)
			: null;

		if (existingLockedFields) {
			validateLockedFields(
				clientId,
				propertiesToModify,
				existingLockedFields,
			);
		}

		const lockedFields = mergeLockedFields(
			nodeType,
			clientId,
			query,
			existingLockedFields,
		);

		const removedRelationships = recordAnalysis.getRemovedRelationships({
			nodeType,
			initialContent: existingRecord,
			newContent: body,
			action: relationshipAction,
		});
		const addedRelationships = recordAnalysis.getAddedRelationships({
			nodeType,
			initialContent: existingRecord,
			newContent: body,
		});

		const willModifyNode = Object.keys(propertiesToModify).length;

		const willDeleteRelationships = !!Object.keys(removedRelationships)
			.length;
		const willCreateRelationships = !!Object.keys(addedRelationships)
			.length;
		const willModifyRelationships =
			willDeleteRelationships || willCreateRelationships;

		const willModifyLockedFields =
			(unlockFields || lockFields) &&
			lockedFields !== existingRecord._lockedFields;

		const updateDataBase = !!(
			willModifyNode ||
			willModifyRelationships ||
			willModifyLockedFields
		);

		if (!updateDataBase) {
			logger.info(
				{ event: 'SKIP_NODE_UPDATE' },
				'No changed properties, relationships or field locks - skipping update',
			);
			return existingRecord;
		}

		const queryParts = [
			stripIndents`MERGE (node:${nodeType} { code: $code })
					ON CREATE SET
						${cypherHelpers.metaPropertiesForCreate('node')}
				`,
		];

		if (updateDataBase) {
			queryParts.push(stripIndents`ON MATCH SET
				${cypherHelpers.metaPropertiesForUpdate('node')}
				SET node += $properties
			`);
		}
		const parameters = {};
		if (willDeleteRelationships) {
			const {
				parameters: delParams,
				queryParts: relDeleteQueries,
			} = prepareRelationshipDeletion(nodeType, removedRelationships);

			queryParts.push(...relDeleteQueries);
			Object.assign(parameters, delParams);
		}

		return await writeNode({
			nodeType,
			code,
			method: 'PATCH',
			upsert,
			isCreate: !existingRecord,

			propertiesToModify,
			lockedFields,
			relationshipsToCreate: addedRelationships,
			removedRelationships,
			parameters,
			queryParts,

			willDeleteRelationships,
		});
	} catch (err) {
		dbErrorHandlers.nodeUpsert(err);
		throw err;
	}
};

module.exports = update;

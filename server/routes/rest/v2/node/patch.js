const { stripIndents } = require('common-tags');
const { validateParams, validatePayload } = require('../../lib/validation');
const {
	dbErrorHandlers,
	preflightChecks,
} = require('../../lib/error-handling');

const { logger } = require('../../../../lib/request-context');
const {
	metaPropertiesForUpdate,
	metaPropertiesForCreate,
} = require('../../lib/metadata-helpers');
const {
	containsRelationshipData,
	getRemovedRelationships,
	getAddedRelationships,
} = require('../../lib/diff-helpers');
const { writeNode, createNewNode } = require('../../lib/write-helpers');

const {
	prepareRelationshipDeletion,
} = require('../../lib/relationship-write-helpers');
const { getNodeWithRelationships } = require('../../lib/read-helpers');
const { constructNeo4jProperties } = require('../../lib/neo4j-type-conversion');
const { mergeLockedFields } = require('../../lib/locked-fields');

const update = async input => {
	validateParams(input);
	validatePayload(input);

	const { nodeType, code, clientId, query, body } = input;
	const { relationshipAction, upsert, lockFields, unlockFields } = query;

	if (containsRelationshipData(nodeType, body)) {
		preflightChecks.bailOnMissingRelationshipAction(relationshipAction);
		preflightChecks.handleSimultaneousWriteAndDelete(body);
	}

	try {
		const prefetch = await getNodeWithRelationships(nodeType, code);

		const existingRecord = prefetch.toApiV2(nodeType);

		if (!existingRecord) {
			return await createNewNode({
				nodeType,
				code,
				clientId,
				query,
				body,
				method: 'PATCH',
			});
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

		const lockedFields = mergeLockedFields({
			body,
			clientId,
			lockFields,
			unlockFields,
			existingLockedFields,
		});

		const removedRelationships = getRemovedRelationships({
			nodeType,
			initialContent: existingRecord,
			newContent: body,
			action: relationshipAction,
		});
		const addedRelationships = getAddedRelationships({
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
						${metaPropertiesForCreate('node')}
				`,
		];

		if (updateDataBase) {
			queryParts.push(stripIndents`ON MATCH SET
				${metaPropertiesForUpdate('node')}
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
			body,
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

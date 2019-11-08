const { stripIndents } = require('common-tags');
const {
	getType,
} = require('../../../../../../packages/treecreeper-schema-sdk');
const { validateParams, validatePayload } = require('../../lib/validation');
const {
	dbErrorHandlers,
	preflightChecks,
} = require('../../lib/error-handling');

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

		const nodeProperties = getType(nodeType).properties;
		const bodyDocuments = {};
		const bodyNoDocs = {};
		Object.keys(body).forEach(prop => {
			if (
				nodeProperties[prop] &&
				nodeProperties[prop].type === 'Document'
			) {
				bodyDocuments[prop] = body[prop];
			} else {
				bodyNoDocs[prop] = body[prop];
			}
		});

		const propertiesToModify = constructNeo4jProperties({
			nodeType,
			newContent: bodyNoDocs,
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
			validateInput: true,
		});

		const removedRelationships = getRemovedRelationships({
			nodeType,
			initialContent: existingRecord,
			newContent: bodyNoDocs,
			action: relationshipAction,
		});

		const addedRelationships = getAddedRelationships({
			nodeType,
			initialContent: existingRecord,
			newContent: bodyNoDocs,
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

		const willUpdateNeo4j = !!(
			willModifyNode ||
			willModifyRelationships ||
			willModifyLockedFields
		);

		const queryParts = [
			stripIndents`MERGE (node:${nodeType} { code: $code })
					ON CREATE SET
						${metaPropertiesForCreate('node')}
				`,
		];

		if (willUpdateNeo4j) {
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
			bodyDocuments,
			willUpdateNeo4j,
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

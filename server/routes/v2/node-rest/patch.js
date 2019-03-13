const { stripIndents } = require('common-tags');
const { getType } = require('@financial-times/biz-ops-schema');
const { validateParams, validatePayload } = require('../../../lib/validation');
const {
	dbErrorHandlers,
	preflightChecks,
} = require('../../../lib/error-handling');

const { logger } = require('../../../lib/request-context');
const cypherHelpers = require('../../../data/cypher-helpers');
const recordAnalysis = require('../../../data/record-analysis');
const executor = require('./_post-patch-executor');
const { constructNeo4jProperties } = require('../../../data/data-conversion');
const { createNewNode } = require('./post');
const {
	mergeLockedFields,
	validateLockedFields,
} = require('../../../lib/locked-fields');

const update = async input => {
	validateParams(input);
	validatePayload(input);

	const {
		nodeType,
		code,
		clientId,
		query: { relationshipAction, upsert, lockFields },
		body,
	} = input;

	if (recordAnalysis.containsRelationshipData(nodeType, body)) {
		preflightChecks.bailOnMissingRelationshipAction(relationshipAction);
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
				{ upsert, lockFields },
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

		const lockedFields = lockFields
			? mergeLockedFields(
					nodeType,
					clientId,
					lockFields,
					existingLockedFields,
			  )
			: null;

		const {
			removedRelationships,
			addedRelationships,
		} = recordAnalysis.diffRelationships({
			nodeType,
			initialContent: existingRecord,
			newContent: body,
			action: relationshipAction,
		});

		const willModifyNode = Object.keys(propertiesToModify).length;

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

		const parameters = {};

		const queryParts = [
			stripIndents`MERGE (node:${nodeType} { code: $code })
					ON CREATE SET
						${cypherHelpers.metaPropertiesForCreate('node')}
				`,
		];

		if (willModifyNode || willModifyRelationships) {
			queryParts.push(stripIndents`ON MATCH SET
				${cypherHelpers.metaPropertiesForUpdate('node')}
				SET node += $properties
			`);
		}

		if (willDeleteRelationships) {
			const schema = getType(nodeType);
			queryParts.push(
				...Object.entries(removedRelationships).map(
					([propName, codes]) => {
						const def = schema.properties[propName];
						const key = `Delete${def.relationship}${def.direction}${
							def.type
						}`;
						parameters[key] = codes;
						return `WITH node
				${cypherHelpers.deleteRelationships(def, key)}
				`;
					},
				),
			);
		}

		return await executor({
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

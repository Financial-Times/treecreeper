const { stripIndents } = require('common-tags');
const AWS = require('aws-sdk');
const { diff } = require('deep-diff');
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

	const s3 = new AWS.S3({
		accessKeyId: process.env.AWS_ACCESS_KEY,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	});

	const params = {
		Bucket: 'biz-ops-documents.510688331160',
		Key: `${nodeType}/${code}`,
	};
	s3.getObject(params, function(readErr, readData) {
		console.log(readErr, readData);
		if (readErr) {
			console.log(readErr, readErr.stack);
			s3.upload(
				Object.assign({ Body: JSON.stringify(body) }, params),
				function(writeErr, writeData) {
					console.log(writeErr, writeData);
					console.log("patch, node doesn't exist");
				},
			);
		} else {
			// console.log("dataaaa ", JSON.parse(data.Body));
			if (diff(JSON.parse(readData.Body), body)) {
				s3.upload(
					Object.assign({ Body: JSON.stringify(body) }, params),
					function(writeErr, writeData) {
						console.log(writeErr, writeData);
						console.log('patch, node updated');
					},
				);
			} else {
				console.log('patch, node is unchanged');
			}
		}
	});

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

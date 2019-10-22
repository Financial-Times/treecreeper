// const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const _isEmpty = require('lodash.isempty');
const { executeQuery } = require('./lib/neo4j-model');
const {
	validateInput,
	validateRelationshipAction,
	validateRelationshipInput,
} = require('./lib/validation');
const { getNeo4jRecord } = require('./lib/read-helpers');
const { constructNeo4jProperties } = require('./lib/neo4j-type-conversion');
const {
	getAddedRelationships,
	getRemovedRelationships,
	containsRelationshipData,
} = require('./lib/relationships/input');
const { postHandler } = require('./post');
const {
	prepareToWriteRelationships,
	prepareRelationshipDeletion,
	handleUpsertError,
} = require('./lib/relationships/write');
const { diffProperties } = require('./lib/diff-properties');
const { getNeo4jRecordCypherQuery } = require('./lib/read-helpers');
const {
	metaPropertiesForUpdate,
	prepareMetadataForNeo4jQuery,
} = require('./lib/metadata-helpers');
const { separateDocsFromBody } = require('./lib/separate-documents-from-body');
const { mergeLockedFields } = require('./lib/locked-fields');

const determineChangeFlags = (
	properties,
	removedRelationships,
	addedRelationships,
	willModifyLockedFields = false,
) => {
	const willModifyNode = !!Object.keys(properties).length;
	const willDeleteRelationships = !!Object.keys(removedRelationships).length;
	const willCreateRelationships = !!Object.keys(addedRelationships).length;
	const willModifyRelationships =
		willDeleteRelationships || willCreateRelationships;

	return {
		willModifyNode,
		willDeleteRelationships,
		willCreateRelationships,
		willModifyLockedFields,
		willUpdateNeo4j: !!(
			willModifyNode ||
			willModifyRelationships ||
			willModifyLockedFields
		),
	};
};

const patchHandler = ({ documentStore = { patch: () => ({}) } } = {}) => {
	const post = postHandler({ documentStore });

	return async input => {
		const {
			type,
			code,
			clientId,
			body,
			metadata = {},
			query = {},
		} = validateInput(input);
		const {
			relationshipAction,
			// upsert,
			lockFields,
			unlockFields,
		} = query;

		if (containsRelationshipData(type, body)) {
			validateRelationshipAction(relationshipAction);
			validateRelationshipInput(body);
		}

		const preflightRequest = await getNeo4jRecord(type, code);
		if (!preflightRequest.hasRecords()) {
			return Object.assign(await post(input), { status: 201 });
		}

		const initialContent = preflightRequest.toJson(type);

		const { bodyDocuments, bodyNoDocs } = separateDocsFromBody(type, body);

		const properties = constructNeo4jProperties({
			type,
			code,
			body: diffProperties({
				type,
				newContent: bodyNoDocs,
				initialContent,
			}),
		});

		const lockedFields = mergeLockedFields({
			body,
			clientId,
			lockFields,
			unlockFields,
			existingLockedFields:
				JSON.parse(initialContent._lockedFields || null) || {},
			needValidate: true,
		});

		const removedRelationships = getRemovedRelationships({
			type,
			initialContent,
			newContent: bodyNoDocs,
			action: query.relationshipAction,
		});

		const addedRelationships = getAddedRelationships({
			type,
			initialContent,
			newContent: bodyNoDocs,
		});

		const willModifyLockedFields =
			(unlockFields || lockFields) &&
			lockedFields !== initialContent._lockedFields;

		const {
			willDeleteRelationships,
			willCreateRelationships,
			willUpdateNeo4j,
		} = determineChangeFlags(
			properties,
			removedRelationships,
			addedRelationships,
			willModifyLockedFields,
		);

		if (!willUpdateNeo4j) {
			return { status: 200, body: initialContent };
		}

		const queryParts = [
			stripIndents`MERGE (node:${type} { code: $code })
					SET ${metaPropertiesForUpdate('node')}
					SET node += $properties
				`,
		];

		const parameters = {
			...{ code, properties },
			...prepareMetadataForNeo4jQuery(metadata),
		};

		if (willDeleteRelationships) {
			const {
				parameters: delParams,
				queryParts: relDeleteQueries,
			} = prepareRelationshipDeletion(type, removedRelationships);

			queryParts.push(...relDeleteQueries);
			Object.assign(parameters, delParams);
		}
		if (willCreateRelationships) {
			const {
				relationshipParameters,
				relationshipQueries,
			} = prepareToWriteRelationships(
				type,
				addedRelationships,
				query.upsert,
			);
			Object.assign(parameters, relationshipParameters);
			queryParts.push(...relationshipQueries);
		}

		queryParts.push(getNeo4jRecordCypherQuery());

		const {
			body: newBodyDocuments = {},
			undo: undoDocstorePatch,
		} = !_isEmpty(bodyDocuments)
			? await documentStore.patch(type, code, bodyDocuments)
			: {};

		try {
			// TODO: consider lock fields corresponds to writeNode in write-helper.js
			const neo4jResult = await executeQuery(
				queryParts.join('\n'),
				parameters,
			);
			return {
				status: 200,
				body: {
					...neo4jResult.toJson(type),
					...newBodyDocuments,
				},
			};
		} catch (err) {
			if (undoDocstorePatch) {
				await undoDocstorePatch();
			}
			handleUpsertError(err);
			throw err;
		}
	};
};

module.exports = { patchHandler };

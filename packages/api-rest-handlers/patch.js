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

const isNeo4jUpdateNeeded = (
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

	return !!(
		willModifyNode ||
		willModifyRelationships ||
		willModifyLockedFields
	);
};

const buildNeo4jPatchQuery = ({
	type,
	code,
	metadata,
	properties,
	lockedFields,
	upsert,
	removedRelationships,
	addedRelationships,
}) => {
	const baseQuery = stripIndents`MERGE (node:${type} { code: $code })
		SET ${metaPropertiesForUpdate('node')}
		SET node += $properties
		`;

	let deleteRelationshipParams = {};
	let deleteRelationshipQueries = [];
	if (Object.keys(removedRelationships).length) {
		({
			parameters: deleteRelationshipParams,
			queryParts: deleteRelationshipQueries,
		} = prepareRelationshipDeletion(type, removedRelationships));
	}

	let createRelationshipParams = {};
	let createRelationshipQueries = [];
	if (Object.keys(addedRelationships).length) {
		({
			relationshipParameters: createRelationshipParams,
			relationshipQueries: createRelationshipQueries,
		} = prepareToWriteRelationships(type, addedRelationships, upsert));
	}

	const neo4jQuery = [
		baseQuery,
		...deleteRelationshipQueries,
		...createRelationshipQueries,
		getNeo4jRecordCypherQuery(),
	].join('\n');

	properties = {
		...properties,
		_lockedFields: Object.keys(lockedFields).length
			? JSON.stringify(lockedFields)
			: null,
	};
	const parameters = {
		...{ code, properties },
		...prepareMetadataForNeo4jQuery(metadata),
		...deleteRelationshipParams,
		...createRelationshipParams,
	};

	// TODO: Best point of logging neo4j query if we need

	return {
		neo4jQuery,
		parameters,
	};
};

const patchHandler = ({
	documentStore = {
		patch: () => ({}),
		post: () => ({}),
	},
} = {}) => {
	const post = postHandler({ documentStore });

	return async input => {
		const {
			type,
			code,
			body,
			metadata = {},
			query: {
				relationshipAction,
				upsert,
				lockFields,
				unlockFields,
			} = {},
		} = validateInput(input);

		const { clientId } = metadata;

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
			action: relationshipAction,
		});

		const addedRelationships = getAddedRelationships({
			type,
			initialContent,
			newContent: bodyNoDocs,
		});

		const willModifyLockedFields =
			(unlockFields || lockFields) &&
			lockedFields !== initialContent._lockedFields;

		if (
			!isNeo4jUpdateNeeded(
				properties,
				addedRelationships,
				removedRelationships,
				willModifyLockedFields,
			)
		) {
			return { status: 200, body: initialContent };
		}

		const { neo4jQuery, parameters } = buildNeo4jPatchQuery({
			type,
			code,
			metadata,
			properties,
			lockedFields,
			upsert,
			removedRelationships,
			addedRelationships,
			willModifyLockedFields,
		});

		const {
			body: newBodyDocuments = {},
			undo: undoDocstoreWrite,
		} = !_isEmpty(bodyDocuments)
			? await documentStore.patch(type, code, bodyDocuments)
			: {};

		try {
			const neo4jResult = await executeQuery(neo4jQuery, parameters);
			return {
				status: 200,
				body: {
					...neo4jResult.toJson(type),
					...newBodyDocuments,
				},
			};
		} catch (err) {
			if (undoDocstoreWrite) {
				await undoDocstoreWrite();
			}
			handleUpsertError(err);
			throw err;
		}
	};
};

module.exports = { patchHandler };

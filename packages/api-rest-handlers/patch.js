const _isEmpty = require('lodash.isempty');
const {
	validateInput,
	validateRelationshipAction,
	validateRelationshipInput,
} = require('./lib/validation');
const { getNeo4jRecord } = require('./lib/read-helpers');
const { containsRelationshipData } = require('./lib/relationships/input');
const { postHandler } = require('./post');
const { handleUpsertError } = require('./lib/relationships/write');
const { separateDocsFromBody } = require('./lib/separate-documents-from-body');
const { queryBuilder } = require('./lib/neo4j-query-builder');
const { logChanges } = require('../api-publish');

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
			query: { relationshipAction } = {},
		} = validateInput(input);

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

		const {
			body: newBodyDocuments = {},
			undo: undoDocstoreWrite,
		} = !_isEmpty(bodyDocuments)
			? await documentStore.patch(type, code, bodyDocuments)
			: {};

		try {
			const builder = queryBuilder('MERGE', input, bodyNoDocs)
				.constructProperties(initialContent)
				.mergeLockFields(initialContent)
				.removeRelationships(initialContent)
				.addRelationships(initialContent);

			if (!builder.isNeo4jUpdateNeeded()) {
				return { status: 200, body: initialContent };
			}

			const { neo4jResult, queryContext } = await builder.execute();
			const relationships = {
				added: queryContext.addRelationships,
				removed: queryContext.removedRelationships,
			};
			const relatedAction = queryContext.upsert ? 'CREATE' : 'UPDATE';
			logChanges('UPDATE', neo4jResult, { relationships, relatedAction });

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

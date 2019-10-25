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

const patchHandler = ({ documentStore } = {}) => {
	const post = postHandler({ documentStore });

	return async input => {
		const {
			type,
			code,
			body: originalBody,
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

		const { documents = {}, body } = documentStore
			? separateDocsFromBody(type, originalBody)
			: { body: originalBody };

		const {
			body: newBodyDocuments = {},
			undo: undoDocstoreWrite,
		} = !_isEmpty(documents)
			? await documentStore.patch(type, code, documents)
			: {};

		try {
			const builder = queryBuilder('MERGE', input, body)
				.constructProperties(initialContent)
				.mergeLockFields(initialContent)
				.removeRelationships(initialContent)
				.addRelationships(initialContent);

			if (!builder.isNeo4jUpdateNeeded()) {
				return { status: 200, body: initialContent };
			}

			const neo4jResult = await builder.execute();
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

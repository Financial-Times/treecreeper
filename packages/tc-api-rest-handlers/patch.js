const _isEmpty = require('lodash.isempty');
const { logChanges } = require('@financial-times/tc-api-publish');
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
			query: { relationshipAction, richRelationships } = {},
		} = validateInput(input);

		if (containsRelationshipData(type, originalBody)) {
			validateRelationshipAction(relationshipAction);
			validateRelationshipInput(originalBody);
		}

		const preflightRequest = await getNeo4jRecord(type, code);
		if (!preflightRequest.hasRecords()) {
			return Object.assign(await post(input), { status: 201 });
		}

		const initialContent = preflightRequest.toJson({
			type,
			richRelationshipsFlag: true,
		});

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

			let neo4jResultBody;
			if (builder.isNeo4jUpdateNeeded()) {
				const { neo4jResult, queryContext } = await builder.execute();
				neo4jResultBody = neo4jResult.toJson({
					type,
					richRelationshipsFlag: richRelationships,
				});

				const relationships = {
					added: queryContext.addedRelationships,
					removed: queryContext.removedRelationships,
				};
				logChanges('UPDATE', neo4jResult, { relationships });
			} else {
				neo4jResultBody = preflightRequest.toJson({
					type,
					richRelationshipsFlag: richRelationships,
				});
			}

			return {
				status: 200,
				body: {
					...neo4jResultBody,
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

const _isEmpty = require('lodash.isempty');
const {
	validateInput,
	validateRelationshipAction,
	validateRelationshipInput,
} = require('./lib/validation');
const { getNeo4jRecord } = require('./lib/read-helpers');
const {
	containsRelationshipData,
	normaliseRelationshipProps,
} = require('./lib/relationships/input');
const { postHandler } = require('./post');
const { handleUpsertError } = require('./lib/relationships/write');
const { separateDocsFromBody } = require('./lib/separate-documents-from-body');
const { queryBuilder } = require('./lib/neo4j-query-builder');
const { broadcast } = require('./lib/events');

const patchHandler = ({ documentStore } = {}) => {
	const post = postHandler({ documentStore });

	return async input => {
		const {
			type,
			code,
			body: originalBody,
			query: { relationshipAction, richRelationships } = {},
			metadata = {},
		} = validateInput(input);
		console.log({originalBody})
		if (containsRelationshipData(type, originalBody)) {
			validateRelationshipAction(relationshipAction);
			validateRelationshipInput(originalBody);
			normaliseRelationshipProps(type, originalBody);
		}

		const preflightRequest = await getNeo4jRecord(type, code);
		if (!preflightRequest.hasRecords()) {
			return Object.assign(await post(input), { status: 201 });
		}

		const initialContent = preflightRequest.toJson({
			type,
			richRelationshipsFlag: true,
		});
		normaliseRelationshipProps(type, initialContent);

		const { documents = {}, body } = documentStore
			? separateDocsFromBody(type, originalBody)
			: { body: originalBody };

		const {
			body: newBodyDocuments = {},
			undo: undoDocstoreWrite,
			updatedProperties: updatedDocumentProperties,
		} = !_isEmpty(documents)
			? await documentStore.patch(type, code, documents)
			: {};

		try {
			const builder = queryBuilder('MERGE', input, body)
				.constructProperties(initialContent)
				.mergeLockFields(initialContent)
				.removeRelationships(initialContent)
				.changeRelationships(initialContent);

			let neo4jResultBody;
			const event = {
				action: 'UPDATE',
				type,
				code,
				requestId: metadata.requestId,
			};

			if (builder.isNeo4jUpdateNeeded()) {
				const {
					neo4jResult,
					queryContext,
					parameters,
				} = await builder.execute();
				neo4jResultBody = neo4jResult.toJson({
					type,
					richRelationshipsFlag: richRelationships,
				});

				event.changedRelationships = queryContext.changedRelationships;
				event.removedRelationships = queryContext.removedRelationships;
				event.neo4jResult = neo4jResult;
				event.updatedProperties = [
					...new Set([
						...Object.keys(parameters.properties),
						...Object.keys(queryContext.removedRelationships || {}),
						...Object.keys(queryContext.changedRelationships || {}),
						...(updatedDocumentProperties || []),
					]),
				];
			} else {
				neo4jResultBody = preflightRequest.toJson({
					type,
					richRelationshipsFlag: richRelationships,
				});
				event.updatedProperties = updatedDocumentProperties || [];
			}
			broadcast(event);
			const responseData = {
				...neo4jResultBody,
				...newBodyDocuments,
			};

			return {
				status: 200,
				body: responseData,
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

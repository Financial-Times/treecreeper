const httpErrors = require('http-errors');
const _isEmpty = require('lodash.isempty');
const { getType } = require('@financial-times/tc-schema-sdk');
const { validateInput } = require('./lib/validation');
const { handleUpsertError } = require('./lib/relationships/write');
const { separateDocsFromBody } = require('./lib/separate-documents-from-body');
const { queryBuilder } = require('./lib/neo4j-query-builder');
const { normaliseRelationshipProps } = require('./lib/relationships/input');
const { broadcast } = require('./lib/events');

const postHandler = ({ documentStore } = {}) => async input => {
	console.log({typeof: typeof input.body.code})
	const {
		type,
		code,
		body: originalBody,
		metadata = {},
		query: { richRelationships } = {},
	} = validateInput(input);
	const { clientId } = metadata;

	normaliseRelationshipProps(type, originalBody);

	const { documents = {}, body } = documentStore
		? separateDocsFromBody(type, originalBody)
		: { body: originalBody };

	const { createPermissions, pluralName } = getType(type);
	if (createPermissions && !createPermissions.includes(clientId)) {
		throw httpErrors(
			400,
			`${pluralName} can only be created by ${createPermissions.join(
				', ',
			)}`,
		);
	}

	const { body: newBodyDocs = {}, undo: undoDocstoreWrite } = !_isEmpty(
		documents,
	)
		? await documentStore.post(type, code, documents)
		: {};

	try {
		const { neo4jResult, queryContext, parameters } = await queryBuilder(
			'CREATE',
			input,
			body,
		)
			.constructProperties()
			.createRelationships()
			.setLockFields()
			.execute();

		const responseData = Object.assign(
			neo4jResult.toJson({
				type,
				richRelationshipsFlag: richRelationships,
			}),
			newBodyDocs,
		);
		broadcast({
			action: 'CREATE',
			type,
			code,
			updatedProperties: [
				...new Set([
					...Object.keys(parameters.properties),
					...Object.keys(queryContext.changedRelationships || {}),
					...Object.keys(documents),
				]),
			],
			neo4jResult,
			requestId: metadata.requestId,
			changedRelationships: queryContext.changedRelationships,
		});
		return { status: 200, body: responseData };
	} catch (err) {
		if (undoDocstoreWrite) {
			await undoDocstoreWrite();
		}

		if (/already exists with label/.test(err.message)) {
			throw httpErrors(409, `${type} ${code} already exists`);
		}
		handleUpsertError(err);
		throw err;
	}
};

module.exports = { postHandler };

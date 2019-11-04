const httpErrors = require('http-errors');
const _isEmpty = require('lodash.isempty');
const { validateInput } = require('./lib/validation');
const { getType } = require('../schema-sdk');
const { handleUpsertError } = require('./lib/relationships/write');
const { separateDocsFromBody } = require('./lib/separate-documents-from-body');
const { queryBuilder } = require('./lib/neo4j-query-builder');
const { logChanges } = require('../api-publish');

const postHandler = ({ documentStore } = {}) => async input => {
	const { type, code, body: originalBody, metadata = {} } = validateInput(
		input,
	);
	const { clientId } = metadata;

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
		const { neo4jResult, queryContext } = await queryBuilder(
			'CREATE',
			input,
			body,
		)
			.constructProperties()
			.createRelationships()
			.setLockFields(documents)
			.execute();

		const relationships = {
			added: queryContext.addedRelationships || {},
		};
		logChanges('CREATE', neo4jResult, { relationships });

		const responseData = Object.assign(
			neo4jResult.toJson({ type }),
			newBodyDocs,
		);

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

const httpErrors = require('http-errors');
const _isEmpty = require('lodash.isempty');
const { validateInput } = require('./lib/validation');
const { getType } = require('../schema-sdk');
const { handleUpsertError } = require('./lib/relationships/write');
const { separateDocsFromBody } = require('./lib/separate-documents-from-body');
const { queryBuilder } = require('./lib/neo4j-query-builder');
const { logChanges } = require('../api-publish');

const postHandler = ({
	documentStore = { post: () => ({}) },
} = {}) => async input => {
	const { type, code, body, metadata = {} } = validateInput(input);
	const { clientId } = metadata;

	const { bodyDocuments, bodyNoDocs } = separateDocsFromBody(type, body);

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
		bodyDocuments,
	)
		? await documentStore.post(type, code, bodyDocuments)
		: {};

	try {
		const { neo4jResult, queryContext } = await queryBuilder(
			'CREATE',
			input,
			bodyNoDocs,
		)
			.constructProperties()
			.createRelationships()
			.setLockFields(bodyDocuments)
			.execute();

		const relationships = {
			added: queryContext.addedRelationships || {},
		};
		logChanges('CREATE', neo4jResult, { relationships });

		const responseData = Object.assign(
			neo4jResult.toJson(type),
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

const httpErrors = require('http-errors');
const _isEmpty = require('lodash.isempty');
const { getType } = require('@financial-times/tc-schema-sdk');
const { validateInput } = require('./lib/validation');
const { handleUpsertError } = require('./lib/relationships/write');
const { separateDocsFromBody } = require('./lib/separate-documents-from-body');
const { queryBuilder } = require('./lib/neo4j-query-builder');

const postHandler = ({ documentStore, logChanges = () => null } = {}) => async input => {
	const {
		type,
		code,
		body: originalBody,
		metadata = {},
		query: { richRelationships } = {},
	} = validateInput(input);
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
			.setLockFields()
			.execute();

		const relationships = {
			added: queryContext.addedRelationships || {},
		};
		logChanges('CREATE', neo4jResult, { relationships });

		const responseData = Object.assign(
			neo4jResult.toJson({
				type,
				richRelationshipsFlag: richRelationships,
			}),
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

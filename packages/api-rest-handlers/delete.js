const httpErrors = require('http-errors');
const { validateInput } = require('./lib/validation');
const { getNeo4jRecord } = require('./lib/read-helpers');
const { executeQuery } = require('./lib/neo4j-model');
const { logChanges } = require('../api-publish');

const deleteHandler = ({
	documentStore,
	logger = console,
} = {}) => async input => {
	const { type, code } = validateInput(input);
	const neo4jResult = await getNeo4jRecord(type, code);

	if (!neo4jResult.hasRecords()) {
		throw httpErrors(404, `${type} ${code} does not exist`);
	}
	if (neo4jResult.hasRelationships()) {
		throw httpErrors(
			409,
			`Cannot delete - ${type} ${code} has relationships.`,
			// TODO add details of which rels exist
			// OR maybe address the delete UX problems for good??
			//  + `Remove all ${relationshipsThatExist.join(
			// 	', ',
			// )} relationships before attempting to delete this record.`,
		);
	}

	const query = `MATCH (node:${type} {code: $code}) DELETE node`;

	let undoDocstoreWrite;

	if (documentStore) {
		// Writes are in series, not parallel, to simplify rollback on error
		const { undo } = await documentStore.delete(type, code);
		undoDocstoreWrite = undo;
	}

	try {
		await executeQuery(query, { code });
		logChanges('DELETE', neo4jResult);
	} catch (error) {
		logger.error(
			{ event: 'NEO4J_DELETE_FAILURE', error },
			'Neo4j Delete unsuccessful. Rolling back S3 delete',
		);
		if (undoDocstoreWrite) {
			await undoDocstoreWrite();
		}
		throw error;
	}

	return { status: 204 };
};

module.exports = { deleteHandler };

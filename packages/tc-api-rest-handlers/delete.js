const httpErrors = require('http-errors');
const { executeQuery } = require('./lib/neo4j-model');
const { validateInput } = require('./lib/validation');
const { getNeo4jRecord } = require('./lib/read-helpers');
const { broadcast } = require('./lib/events');

const deleteHandler = ({
	documentStore,
	logger = console,
} = {}) => async input => {
	const { type, code } = validateInput(input);
	const prefetchResult = await getNeo4jRecord(type, code);

	if (!prefetchResult.hasRecords()) {
		throw httpErrors(404, `${type} ${code} does not exist`);
	}
	if (prefetchResult.hasRelationships()) {
		throw httpErrors(
			409,
			`Cannot delete - ${type} ${code} has relationships.`,
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
		const neo4jResult = await executeQuery(query, { code });
		broadcast({ action: 'DELETE', code, type, neo4jResult });
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

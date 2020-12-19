const httpErrors = require('http-errors');
const { executeQuery } = require('./lib/neo4j-model');
const { validateInput } = require('./lib/validation');
const { getNeo4jRecord } = require('./lib/read-helpers');
const { broadcast } = require('./lib/events');
const { getAllRelationships } = require('./lib/relationships/input');

const deleteHandler = ({
	documentStore,
	logger = console,
} = {}) => async input => {
	const { type, code, query: { force } = {} } = validateInput(input);
	const prefetchResult = await getNeo4jRecord(type, code);

	if (!prefetchResult.hasRecords()) {
		throw httpErrors(404, `${type} ${code} does not exist`);
	}
	if (!force && prefetchResult.hasRelationships()) {
		throw httpErrors(
			409,
			`Cannot delete - ${type} ${code} has relationships.`,
		);
	}

	const query = `MATCH (node:${type} {code: $code}) ${
		force ? 'DETACH ' : ''
	}DELETE node`;

	let undoDocstoreWrite;

	if (documentStore) {
		// Writes are in series, not parallel, to simplify rollback on error
		const { undo } = await documentStore.delete(type, code);
		undoDocstoreWrite = undo;
	}

	try {
		await executeQuery(query, { code });
		broadcast({
			action: 'DELETE',
			code,
			type,
			// Gets all the relationship properties of the original neo4j record
			removedRelationships: getAllRelationships(
				type,
				prefetchResult.toJson({ type, excludeMeta: true }),
			),
		});
	} catch (error) {
		logger.error(
			{
				event: 'NEO4J_DELETE_FAILURE',
				message: 'Neo4j Delete unsuccessful. Rolling back S3 delete',
			},
			error,
		);
		if (undoDocstoreWrite) {
			await undoDocstoreWrite();
		}
		throw error;
	}

	return { status: 204 };
};

module.exports = { deleteHandler };

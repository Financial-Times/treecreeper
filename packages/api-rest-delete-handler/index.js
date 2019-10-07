const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const { validateInput } = require('../api-core/lib/validation');
const { getNeo4jRecord } = require('../api-core');
const { executeQuery } = require('../api-core/lib/neo4j-model');
const { logger } = require('../api-core/lib/request-context');

const deleteHandler = ({
	documentStore = { delete: () => null },
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

	const query = stripIndents`
	MATCH (node:${type} {code: $code})
	DELETE node
	`;
	// Prefer simplicity/readability over optimisation here -
	// S3 and neo4j deletes are in series instead of parallel
	// so we don't have to bother thinking about rolling back actions for
	// all the different possible combinations of successes/failures
	// in different orders. S3 requests are more reliable than neo4j
	// requests so try s3 first, and roll back S3 if neo4j delete fails.
	const deleteMarker = await documentStore.delete(type, code);
	try {
		const res = await executeQuery(query, { code });
		logger.info(
			{ event: 'DELETE_NEO4J_SUCCESS' },
			res,
			'DELETE: Neo4j Delete successful',
		);
	} catch (err) {
		logger.info(
			{ event: 'DELETE_NEO4J_FAILURE' },
			err,
			'DELETE: Neo4j Delete unsuccessful, attempting to rollback S3 delete',
		);
		documentStore.delete(type, code, deleteMarker);
		throw new Error(err);
	}

	return { status: 204 };
};

module.exports = { deleteHandler };

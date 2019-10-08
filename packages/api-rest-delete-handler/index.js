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

	const query = `MATCH (node:${type} {code: $code}) DELETE node`;

	// Writes are in series, not parallel, to simplify rollback on error
	const deleteMarker = await documentStore.delete(type, code);
	try {
		const res = await executeQuery(query, { code });
	} catch (error) {
		logger.error(
			{ event: 'NEO4J_DELETE_FAILURE', error },
			'Neo4j Delete unsuccessful. Rolling back S3 delete',
		);
		documentStore.delete(type, code, deleteMarker);
		throw new Error(err);
	}

	return { status: 204 };
};

module.exports = { deleteHandler };

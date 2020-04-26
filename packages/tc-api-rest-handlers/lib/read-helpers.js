const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const { executeQuery } = require('./neo4j-model');

const getNeo4jRecordCypherQuery = ({
	nodeName = 'node',
	includeWithStatement = true,
} = {}) => stripIndents`
	${includeWithStatement ? `WITH DISTINCT ${nodeName}` : ''}
	OPTIONAL MATCH (${nodeName})-[relationship]-(related)
	RETURN ${nodeName}, relationship, labels(related) AS relatedLabels, related.code AS relatedCode, related._createdByRequest
	ORDER BY related.code`;

const getNeo4jRecord = (type, code, idField = 'code') => {
	return executeQuery(
		`MATCH (node:${type} {${idField}: $code})
			${getNeo4jRecordCypherQuery()}`,
		{ code },
	);
};

const getNeo4jNode = (type, code, idField = 'code') => {
	return executeQuery(
		`MATCH (node:${type} {${idField}: $code})
		RETURN node`,
		{ code },
	);
};

const checkForUniqueRecord = ({ neo4jResult, idField, type, code }) => {
	if (!neo4jResult.hasRecords()) {
		throw httpErrors(
			404,
			`${type} with ${idField} "${code}" does not exist`,
		);
	}

	if (idField !== 'code' && neo4jResult.hasMultipleRoots()) {
		throw httpErrors(
			409,
			`Multiple ${type} records with ${idField} "${code}" exist`,
		);
	}
};

module.exports = {
	getNeo4jRecordCypherQuery,
	getNeo4jRecord,
	getNeo4jNode,
	checkForUniqueRecord,
};

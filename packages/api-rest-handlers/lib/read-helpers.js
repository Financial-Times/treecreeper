const { stripIndents } = require('common-tags');
const { executeQuery } = require('./neo4j-model');

const getNeo4jRecordCypherQuery = ({
	nodeName = 'node',
	includeWithStatement = true,
} = {}) => stripIndents`
	${includeWithStatement ? `WITH ${nodeName}` : ''}
	OPTIONAL MATCH (${nodeName})-[relationship]-(related)
	RETURN ${nodeName}, relationship, labels(related) AS relatedLabels, related.code AS relatedCode, related._createdByRequest AS relatedRequestId`;

const getNeo4jRecord = (type, code) => {
	return executeQuery(
		`MATCH (node:${type} {code: $code})
			${getNeo4jRecordCypherQuery()}`,
		{ code },
	);
};

const getNeo4jNode = (type, code) => {
	return executeQuery(
		`MATCH (node:${type} {code: $code})
		RETURN node`,
		{ code },
		true,
	);
};

module.exports = {
	getNeo4jRecordCypherQuery,
	getNeo4jRecord,
	getNeo4jNode,
};

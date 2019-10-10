const { stripIndents } = require('common-tags');
const { executeQuery } = require('./neo4j-model');

const getNeo4jRecordCypherQuery = ({
	nodeName = 'node',
	includeWithStatement = true,
} = {}) => stripIndents`
	${includeWithStatement ? `WITH ${nodeName}` : ''}
	OPTIONAL MATCH (${nodeName})-[relationship]-(related)
	RETURN ${nodeName}, relationship, labels(related) AS relatedLabels, related.code AS relatedCode, related._createdByRequest AS relatedRequestId`;

const getNeo4jRecord = (nodeType, code) => {
	return executeQuery(
		`MATCH (node:${nodeType} {code: $code})
			${getNeo4jRecordCypherQuery()}`,
		{ code },
	);
};

module.exports = {
	getNeo4jRecordCypherQuery,
	getNeo4jRecord,
};

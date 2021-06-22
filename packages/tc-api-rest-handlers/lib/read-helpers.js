const { stripIndents } = require('common-tags');
const { executeQuery } = require('./neo4j-model');

const getNeo4jRecordCypherQuery = ({
	nodeName = 'node',
	includeWithStatement = true,
	relationshipTypes,
} = {}) => {
	return stripIndents`
	${includeWithStatement ? `WITH DISTINCT ${nodeName}` : ''}
	OPTIONAL MATCH (${nodeName})-[relationship${
		relationshipTypes ? `:${relationshipTypes.join('|')}` : ''
	}]-(related)
	RETURN ${nodeName}, relationship, labels(related) AS relatedLabels, related.code AS relatedCode, related._createdByRequest
	ORDER BY related.code`;
};

const getNeo4jRecord = (
	type,
	code,
	{ richRelationshipsFlag, relationshipTypes } = {},
) => {
	return executeQuery(
		`MATCH (node:${type} {code: $code})
			${getNeo4jRecordCypherQuery({ relationshipTypes })}`,
		{ code },
		richRelationshipsFlag,
	);
};

const getNeo4jNode = (type, code) => {
	return executeQuery(
		`MATCH (node:${type} {code: $code})
		RETURN node`,
		{ code },
	);
};

module.exports = {
	getNeo4jRecordCypherQuery,
	getNeo4jRecord,
	getNeo4jNode,
};

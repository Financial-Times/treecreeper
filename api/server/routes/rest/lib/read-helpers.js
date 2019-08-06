const { stripIndents } = require('common-tags');
const { executeQuery } = require('./neo4j-model');

const nodeWithRelsCypher = ({
	nodeName = 'node',
	includeWithStatement = true,
} = {}) => stripIndents`
	${includeWithStatement ? `WITH ${nodeName}` : ''}
	OPTIONAL MATCH (${nodeName})-[relationship]-(related)
	RETURN ${nodeName}, relationship, labels(related) AS relatedLabels, related.code AS relatedCode, related._createdByRequest AS relatedRequestId`;

const getNodeWithRelationships = (nodeType, code) => {
	return executeQuery(
		`MATCH (node:${nodeType} {code: $code})
			${nodeWithRelsCypher()}`,
		{ code },
		true,
	);
};

module.exports = {
	nodeWithRelsCypher,
	getNodeWithRelationships,
};

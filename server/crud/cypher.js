const { stripIndents } = require('common-tags');

const RETURN_NODE_WITH_RELS = `
	WITH node
	OPTIONAL MATCH (node)-[relationship]-(related)
	RETURN node, relationship, related`;

const relFragment = (type, direction) => {
	const left = direction === 'incoming' ? '<' : '';
	const right = direction === 'outgoing' ? '>' : '';
	return `${left}-[rel:${type}]-${right}`;
};

const upsertRelationshipQuery = ({
	relType,
	direction,
	nodeType,
	nodeCode,
	requestId
}) =>
	stripIndents`
	WITH node
	MERGE (related:${nodeType} {id: "${nodeCode}"})
		ON CREATE SET related.createdByRequest = "${requestId}"
	WITH related, node
	MERGE (node)${relFragment(relType, direction, requestId)}(related)
		ON CREATE SET rel.createdByRequest = "${requestId}"`;

const createRelationshipQuery = ({
	relType,
	direction,
	nodeType,
	nodeCode,
	requestId,
	i
}) =>
	// uses OPTIONAL MATCH as this returns [null] rather than []
	// this means the next line tries to create a relationship pointing
	// at null, so we get an informative error
	stripIndents`WITH node
	OPTIONAL MATCH (related${i}:${nodeType} {id: "${nodeCode}"})
	MERGE (node)${relFragment(relType, direction, requestId)}(related${i})
		ON CREATE SET rel.createdByRequest = "${requestId}"`;

module.exports = {
	RETURN_NODE_WITH_RELS,
	relFragment,
	upsertRelationshipQuery,
	createRelationshipQuery
};

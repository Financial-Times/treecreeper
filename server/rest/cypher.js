const { stripIndents } = require('common-tags');

const RETURN_NODE_WITH_RELS = stripIndents`
	WITH node
	OPTIONAL MATCH (node)-[relationship]-(related)
	RETURN node, relationship, related`;

const relFragment = (type, direction) => {
	const left = direction === 'incoming' ? '<' : '';
	const right = direction === 'outgoing' ? '>' : '';
	return `${left}-[rel:${type}]-${right}`;
};

const upsertRelationshipQuery = ({ relType, direction, nodeType, nodeCode }) =>
	stripIndents`
	WITH node
	MERGE (related:${nodeType} {code: "${nodeCode}"})
		ON CREATE SET related._createdByRequest = $requestId
	WITH related, node
	MERGE (node)${relFragment(relType, direction)}(related)
		ON CREATE SET rel._createdByRequest = $requestId`;

const createRelationshipQuery = ({
	relType,
	direction,
	nodeType,
	nodeCode,
	i
}) =>
	// uses OPTIONAL MATCH as this returns [null] rather than []
	// this means the next line tries to create a relationship pointing
	// at null, so we get an informative error
	stripIndents`WITH node
	OPTIONAL MATCH (related${i}:${nodeType} {code: "${nodeCode}"})
	MERGE (node)${relFragment(relType, direction)}(related${i})
		ON CREATE SET rel._createdByRequest = $requestId`;

const createRelationships = (upsert, relationships) => {
	const mapFunc = upsert ? upsertRelationshipQuery : createRelationshipQuery;
	return relationships.map((rel, i) => mapFunc(Object.assign({ i }, rel)));
};

module.exports = {
	RETURN_NODE_WITH_RELS,
	relFragment,
	createRelationships
};

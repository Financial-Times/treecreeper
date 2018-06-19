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

const upsertRelationshipQuery = ({ relType, direction, nodeType, i }) =>
	stripIndents`
	WITH node
	MERGE (related:${nodeType} {code: $relatedNodeCode${i}})
		ON CREATE SET ${metaAttributesForCreate('related')}
	WITH related, node
	MERGE (node)${relFragment(relType, direction)}(related)
		ON CREATE SET ${metaAttributesForCreate('rel')}`;

const createRelationshipQuery = ({ relType, direction, nodeType, i }) =>
	// uses OPTIONAL MATCH as this returns [null] rather than []
	// this means the next line tries to create a relationship pointing
	// at null, so we get an informative error
	stripIndents`WITH node
	OPTIONAL MATCH (related${i}:${nodeType} {code: $relatedNodeCode${i}})
	MERGE (node)${relFragment(relType, direction)}(related${i})
		ON CREATE SET ${metaAttributesForCreate('rel')}`;

const createRelationships = (upsert, relationships, globalParameters) => {
	const mapFunc = upsert ? upsertRelationshipQuery : createRelationshipQuery;
	return relationships.map((rel, i) => {
		// make sure the parameter referenced in the query exists on the
		// globalParameters object passed to the db driver
		Object.assign(globalParameters, { [`relatedNodeCode${i}`]: rel.nodeCode });
		return mapFunc(Object.assign({ i }, rel));
	});
};

const metaAttributesForCreate = type => stripIndents`
	${type}._createdByRequest = $requestId,
	${type}._createdByClient = $clientId,
	${type}._createdTimestamp = $date,
	${type}._updatedByRequest = $requestId,
	${type}._updatedByClient = $clientId,
	${type}._updatedTimestamp = $date
`;

const metaAttributesForUpdate = type => stripIndents`
	${type}._updatedByRequest = $requestId,
	${type}._updatedByClient = $clientId,
	${type}._updatedTimestamp = $date
`;

module.exports = {
	metaAttributesForCreate,
	metaAttributesForUpdate,
	RETURN_NODE_WITH_RELS,
	relFragment,
	createRelationships
};

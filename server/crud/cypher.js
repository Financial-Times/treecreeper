const { stripIndents } = require('common-tags');

const RETURN_NODE_WITH_RELS = stripIndents`
	WITH node
	OPTIONAL MATCH (node)-[relationship]-(related)
	RETURN node, relationship, related`;

const relFragment = (type, direction, i = '') => {
	const left = direction === 'incoming' ? '<' : '';
	const right = direction === 'outgoing' ? '>' : '';
	return `${left}-[rel${i}:${type}]-${right}`;
};

const metaAttributesForCreate = type => stripIndents`
	${type}._createdByRequest = $requestId,
	${type}._createdByClient = $clientId,
	${type}._createdTimestamp = $date,
	${metaAttributesForUpdate(type)}
`;

const metaAttributesForUpdate = type => stripIndents`
	${type}._updatedByRequest = $requestId,
	${type}._updatedByClient = $clientId,
	${type}._updatedTimestamp = $date
`;

const persistRelationships = relationships => `
WITH ${relationships.map((val, i) => `related${i}`).join(',')}, node
`;

// Uses OPTIONAL MATCH when trying to match a node as it returns [null]
// rather than [] if the node doesn't exist
// This means the next line tries to create a relationship pointing
// at null, so we get an informative error
const optionalMatchNode = ({ nodeType }, i) => `
OPTIONAL MATCH (related${i}:${nodeType} {code: $relatedNodeCode${i}})
`;

const mergeNode = ({ nodeType }, i) => `
MERGE (related${i}:${nodeType} {code: $relatedNodeCode${i}})
	ON CREATE SET ${metaAttributesForCreate(`related${i}`)}
`;

const createRelationship = ({ relType, direction }, i) => `
MERGE (node)${relFragment(relType, direction, i)}(related${i})
	ON CREATE SET ${metaAttributesForCreate(`rel${i}`)}
`;

const createRelationships = (upsert, relationships, globalParameters) => {
	// make sure the parameter referenced in the query exists on the
	// globalParameters object passed to the db driver
	relationships.map((rel, i) =>
		Object.assign(globalParameters, { [`relatedNodeCode${i}`]: rel.nodeCode })
	);

	// Note on the limitations of cypher:
	// It would be so nice to use UNWIND to create all these from a list parameter,
	// but unfortunately parameters cannot be used to specify relationship labels
	return `
WITH node
${relationships.map(upsert ? mergeNode : optionalMatchNode).join('\n')}
${persistRelationships(relationships)}
${relationships.map(createRelationship).join('\n')}`;
};

module.exports = {
	metaAttributesForCreate,
	metaAttributesForUpdate,
	RETURN_NODE_WITH_RELS,
	createRelationships
};

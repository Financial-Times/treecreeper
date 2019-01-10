const { stripIndents } = require('common-tags');
const { executeQuery } = require('./db-connection');

const RETURN_NODE_WITH_RELS = stripIndents`
	WITH node
	OPTIONAL MATCH (node)-[relationship]-(related)
	RETURN node, relationship, labels(related) AS relatedLabels, related.code AS relatedCode, related._createdByRequest AS relatedRequestId`;

const relFragment = (type, direction, relName) => {
	const left = direction === 'incoming' ? '<' : '';
	const right = direction === 'outgoing' ? '>' : '';
	return `${left}-[${relName || 'relationship'}:${type}]-${right}`;
};

const metaPropertiesForCreate = type => stripIndents`
	${type}._createdByRequest = $requestId,
	${type}._createdByClient = $clientId,
	${type}._createdByUser = $clientUserId,
	${type}._createdTimestamp = datetime($timestamp),
	${metaPropertiesForUpdate(type)}
`;

const metaPropertiesForUpdate = type => stripIndents`
	${type}._updatedByRequest = $requestId,
	${type}._updatedByClient = $clientId,
	${type}._updatedByUser = $clientUserId
	${type}._updatedTimestamp = datetime($timestamp)
`;

// Must use OPTIONAL MATCH because 'cypher'
const deleteRelationships = ({ relationship, direction, type }, codesKey) => `
OPTIONAL MATCH (node)${relFragment(
	relationship,
	direction,
	'deletableRelationship'
)}(related:${type})
	WHERE related.code IN $${codesKey}
	DELETE deletableRelationship
`;

const getNodeWithRelationships = (nodeType, code) =>
	executeQuery(
		`MATCH (node:${nodeType} {code: $code})
			${RETURN_NODE_WITH_RELS}`,
		{ code }
	);

// Uses OPTIONAL MATCH when trying to match a node as it returns [null]
// rather than [] if the node doesn't exist
// This means the next line tries to create a relationship pointing
// at null, so we get an informative error
const optionalMatchNode = ({ key, type }) => `
OPTIONAL MATCH (related:${type})
WHERE related.code IN $${key}
`;

const mergeNode = ({ key, type }) => `
UNWIND $${key} as nodeCodes
MERGE (related:${type} {code: nodeCodes} )
	ON CREATE SET ${metaPropertiesForCreate('related')}

`;

const mergeRelationship = ({ relationship, direction }) => `
MERGE (node)${relFragment(relationship, direction)}(related)
	ON CREATE SET ${metaPropertiesForCreate('relationship')}
`;

module.exports = {
	optionalMatchNode,
	mergeNode,
	mergeRelationship,
	deleteRelationships,
	relFragment,
	metaPropertiesForCreate,
	metaPropertiesForUpdate,
	RETURN_NODE_WITH_RELS,
	getNodeWithRelationships
};

const { stripIndents } = require('common-tags');
const { executeQuery } = require('./db-connection');

const nodeWithRels = ({
	nodeName = 'node',
	includeWithStatement = true,
} = {}) => stripIndents`
	${includeWithStatement ? `WITH ${nodeName}` : ''}
	OPTIONAL MATCH (${nodeName})-[relationship]-(related)
	RETURN ${nodeName}, relationship, labels(related) AS relatedLabels, related.code AS relatedCode, related._createdByRequest AS relatedRequestId`;

const relFragment = (type, direction) => {
	const left = direction === 'incoming' ? '<' : '';
	const right = direction === 'outgoing' ? '>' : '';
	return `${left}-[relationship:${type}]-${right}`;
};

const metaPropertiesForUpdate = recordName => stripIndents`
	${recordName}._updatedByRequest = $requestId,
	${recordName}._updatedByClient = $clientId,
	${recordName}._updatedByUser = $clientUserId,
	${recordName}._updatedTimestamp = datetime($timestamp),
	${recordName}._lockedFields = $lockedFields
`;

const metaPropertiesForCreate = recordName => stripIndents`
	${recordName}._createdByRequest = $requestId,
	${recordName}._createdByClient = $clientId,
	${recordName}._createdByUser = $clientUserId,
	${recordName}._createdTimestamp = datetime($timestamp),
	${recordName}._lockedFields = $lockedFields,
	${metaPropertiesForUpdate(recordName)}
`;

// Must use OPTIONAL MATCH because 'cypher'
const deleteRelationships = (
	{ relationship, direction, type },
	codesKey,
	nodeName = 'node',
) => `
OPTIONAL MATCH (${nodeName})${relFragment(
	relationship,
	direction,
)}(related:${type})
	WHERE related.code IN $${codesKey}
	DELETE relationship
`;

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

const getNodeWithRelationships = (nodeType, code) => {
	return executeQuery(
		`MATCH (node:${nodeType} {code: $code})
			${nodeWithRels()}`,
		{ code },
		true,
	);
};

module.exports = {
	optionalMatchNode,
	mergeNode,
	mergeRelationship,
	deleteRelationships,
	metaPropertiesForCreate,
	metaPropertiesForUpdate,
	nodeWithRels,
	getNodeWithRelationships,
};

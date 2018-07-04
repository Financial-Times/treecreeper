const { stripIndents } = require('common-tags');

const RETURN_NODE_WITH_RELS = stripIndents`
	WITH node
	OPTIONAL MATCH (node)-[relationship]-(related)
	RETURN node, relationship, related`;

const relFragment = (type, direction) => {
	const left = direction === 'incoming' ? '<' : '';
	const right = direction === 'outgoing' ? '>' : '';
	return `${left}-[relationship:${type}]-${right}`;
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

// Uses OPTIONAL MATCH when trying to match a node as it returns [null]
// rather than [] if the node doesn't exist
// This means the next line tries to create a relationship pointing
// at null, so we get an informative error
const optionalMatchNode = ({ key, nodeType }) => `
OPTIONAL MATCH (related:${nodeType})
WHERE related.code IN $${key}
`;

const mergeNode = ({ key, nodeType }) => `
UNWIND $${key} as nodeCodes
MERGE (related:${nodeType} {code: nodeCodes} )
	ON CREATE SET ${metaAttributesForCreate('related')}

`;

const writeRelationships = ({ relType, direction }) => `
MERGE (node)${relFragment(relType, direction)}(related)
	ON CREATE SET ${metaAttributesForCreate('relationship')}
`;

const groupSimilarRelationships = relationships =>
	Object.entries(
		relationships.reduce((map, rel) => {
			const key = `${rel.relType}:${rel.direction}:${rel.nodeType}`;
			map[key] = map[key] || [];
			map[key].push(rel.nodeCode);
			return map;
		}, {})
	).map(([key, nodeCodes]) => {
		const [relType, direction, nodeType] = key.split(':');
		return {
			key: key.replace(/\:/g, ''),
			relType,
			direction,
			nodeType,
			nodeCodes
		};
	});

const createRelationships = (upsert, relationships, globalParameters) => {
	const groupedRelationships = groupSimilarRelationships(relationships);

	// make sure the parameter referenced in the query exists on the
	// globalParameters object passed to the db driver
	groupedRelationships.map(({ key, nodeCodes }) =>
		Object.assign(globalParameters, { [key]: nodeCodes })
	);

	// Note on the limitations of cypher:
	// It would be so nice to use UNWIND to create all these from a list parameter,
	// but unfortunately parameters cannot be used to specify relationship labels
	return `
${groupedRelationships
		.map(obj => {
			return `
WITH node
${upsert ? mergeNode(obj) : optionalMatchNode(obj)}
WITH node, related
${writeRelationships(obj)}
	`;
		})
		.join('\n')}`;
};

module.exports = {
	metaAttributesForCreate,
	metaAttributesForUpdate,
	RETURN_NODE_WITH_RELS,
	createRelationships
};

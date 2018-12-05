const { stripIndents } = require('common-tags');

const RETURN_NODE_WITH_RELS = stripIndents`
	WITH node
	OPTIONAL MATCH (node)-[relationship]-(related)
	RETURN node, relationship, related`;

const relFragment = (type, direction, relName) => {
	const left = direction === 'incoming' ? '<' : '';
	const right = direction === 'outgoing' ? '>' : '';
	return `${left}-[${relName || 'relationship'}:${type}]-${right}`;
};

const metaPropertiesForCreate = type => stripIndents`
	${type}._createdByRequest = $requestId,
	${type}._createdByClient = $clientId,
	${type}._createdTimestamp = $date,
	${metaPropertiesForUpdate(type)}
`;

const metaPropertiesForUpdate = type => stripIndents`
	${type}._updatedByRequest = $requestId,
	${type}._updatedByClient = $clientId,
	${type}._updatedTimestamp = $date
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

const writeRelationships = ({ relationship, direction }) => `
MERGE (node)${relFragment(relationship, direction)}(related)
	ON CREATE SET ${metaPropertiesForCreate('relationship')}
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

const groupSimilarRelationships = relationships =>
	Object.entries(
		relationships.reduce((map, rel) => {
			const key = `${rel.relationship}:${rel.direction}:${rel.type}`;
			map[key] = map[key] || [];
			map[key].push(rel.code);
			return map;
		}, {})
	).map(([key, codes]) => {
		const [relationship, direction, type] = key.split(':');
		return {
			key: key.replace(/\:/g, ''),
			relationship,
			direction,
			type,
			codes
		};
	});

const createRelationships = (upsert, relationships, globalParameters) => {
	const groupedRelationships = groupSimilarRelationships(relationships);

	// make sure the parameter referenced in the query exists on the
	// globalParameters object passed to the db driver
	groupedRelationships.map(({ key, codes }) =>
		Object.assign(globalParameters, { [key]: codes })
	);

	// Note on the limitations of cypher:
	// It would be so nice to use UNWIND to create all these from a list parameter,
	// but unfortunately parameters cannot be used to specify relationship labels
	return `
${groupedRelationships
		.map(obj => {
			return stripIndents`
		WITH node
		${upsert ? mergeNode(obj) : optionalMatchNode(obj)}
		WITH node, related
		${writeRelationships(obj)}
	`;
		})
		.join('\n')}`;
};

module.exports = {
	deleteRelationships,
	metaPropertiesForCreate,
	metaPropertiesForUpdate,
	createRelationships,
	RETURN_NODE_WITH_RELS
};

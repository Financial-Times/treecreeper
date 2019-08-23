const { stripIndents } = require('common-tags');
const { getType } = require('../../../../../packages/schema-sdk');
const { metaPropertiesForCreate } = require('./metadata-helpers');

const relationshipFragment = (type, direction) => {
	const left = direction === 'incoming' ? '<' : '';
	const right = direction === 'outgoing' ? '>' : '';
	return `${left}-[relationship:${type}]-${right}`;
};

const locateRelatedNodes = ({ type }, key, upsert) => {
	if (upsert) {
		return `
UNWIND $${key} as nodeCodes
MERGE (related:${type} {code: nodeCodes} )
	ON CREATE SET ${metaPropertiesForCreate('related')}
`;
	}
	// Uses OPTIONAL MATCH when trying to match a node as it returns [null]
	// rather than [] if the node doesn't exist
	// This means the next line tries to create a relationship pointing
	// at null, so we get an informative error
	return `
OPTIONAL MATCH (related:${type})
WHERE related.code IN $${key}
`;
};

const prepareToWriteRelationships = (
	nodeType,
	relationshipsToCreate,
	upsert,
) => {
	const { properties: validProperties } = getType(nodeType);

	const relationshipParameters = {};
	const relationshipQueries = [];

	Object.entries(relationshipsToCreate).forEach(([propName, codes]) => {
		const propDef = validProperties[propName];

		const key = `${propDef.relationship}${propDef.direction}${propDef.type}`;

		// make sure the parameter referenced in the query exists on the
		// globalParameters object passed to the db driver
		Object.assign(relationshipParameters, { [key]: codes });

		// Note on the limitations of cypher:
		// It would be so nice to use UNWIND to create all these from a list parameter,
		// but unfortunately parameters cannot be used to specify relationship labels
		relationshipQueries.push(
			stripIndents`
			WITH node
			${locateRelatedNodes(propDef, key, upsert)}
			WITH node, related
			MERGE (node)${relationshipFragment(
				propDef.relationship,
				propDef.direction,
			)}(related)
				ON CREATE SET ${metaPropertiesForCreate('relationship')}
		`,
		);
	});

	return { relationshipParameters, relationshipQueries };
};

const prepareRelationshipDeletion = (nodeType, removedRelationships) => {
	const parameters = {};
	const queryParts = [];

	const schema = getType(nodeType);
	queryParts.push(
		...Object.entries(removedRelationships).map(([propName, codes]) => {
			const def = schema.properties[propName];
			const key = `Delete${def.relationship}${def.direction}${def.type}`;
			parameters[key] = codes;
			// Must use OPTIONAL MATCH because 'cypher'
			return stripIndents`
				WITH node
					OPTIONAL MATCH (node)${relationshipFragment(
						def.relationship,
						def.direction,
					)}(related:${def.type})
				WHERE related.code IN $${key}
				DELETE relationship
			`;
		}),
	);

	return { parameters, queryParts };
};

module.exports = {
	prepareToWriteRelationships,
	prepareRelationshipDeletion,
};

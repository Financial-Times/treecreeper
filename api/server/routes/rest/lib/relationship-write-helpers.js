const { stripIndents } = require('common-tags');
const { getType } = require('@financial-times/tc-schema-sdk');
const { metaPropertiesForCreate } = require('./metadata-helpers');
const { findInversePropertyNames } = require('../../../lib/schema-helpers');

const relationshipFragment = (
	type,
	direction,
	{ label = 'relationship', reverse = false } = {},
) => {
	const [left, right] =
		reverse === (direction === 'outgoing') ? ['<', ''] : ['', '>'];
	return `${left}-[${label}:${type}]-${right}`;
};

const relationshipFragmentWithEndNodes = (
	head,
	{ relationship, direction },
	tail,
	options,
) =>
	`(${head})${relationshipFragment(
		relationship,
		direction,
		options,
	)}(${tail})`;

const locateRelatedNodes = ({ type }, key, upsert) => {
	if (upsert) {
		return stripIndents`
			UNWIND $${key} as nodeCodes
			MERGE (related:${type} {code: nodeCodes} )
				ON CREATE SET ${metaPropertiesForCreate('related')}
		`;
	}
	// Uses OPTIONAL MATCH when trying to match a node as it returns [null]
	// rather than [] if the node doesn't exist
	// This means the next line tries to create a relationship pointing
	// at null, so we get an informative error
	return stripIndents`
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
		const { type: relatedType, direction, relationship } = propDef;
		const key = `${relationship}${direction}${relatedType}`;

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
			MERGE ${relationshipFragmentWithEndNodes('node', propDef, 'related')}
				ON CREATE SET ${metaPropertiesForCreate('relationship')}
		`,
		);

		if (propDef.hasMany) {
			const { properties: relatedProperties } = getType(relatedType);
			const inverseProperties = findInversePropertyNames(
				nodeType,
				propName,
			);
			if (
				inverseProperties.some(
					inverseProperty =>
						relatedProperties[inverseProperty] &&
						!relatedProperties[inverseProperty].hasMany,
				)
			) {
				relationshipQueries.push(
					stripIndents`
				WITH node, related
				OPTIONAL MATCH ${relationshipFragmentWithEndNodes(
					'otherNode',
					propDef,
					'related',
					{
						label: 'conflictingRelationship',
					},
				)}
				WHERE otherNode <> node
				DELETE conflictingRelationship
			`,
				);
			}
		}
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

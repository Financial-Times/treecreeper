const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const {
	getType,
	findInversePropertyNames,
} = require('@financial-times/tc-schema-sdk');
const {
	metaPropertiesForCreate,
	metaPropertiesForUpdate,
} = require('../metadata-helpers');

const relationshipFragment = (type, direction, label = 'relationship') => {
	const [left, right] = direction === 'incoming' ? ['<', ''] : ['', '>'];
	return `${left}-[${label}:${type}]-${right}`;
};

const relationshipFragmentWithEndNodes = (
	head,
	{ relationship, direction },
	tail,
	label,
) =>
	`(${head})${relationshipFragment(relationship, direction, label)}(${tail})`;

const prepareToWriteRelationships = (
	nodeType,
	relationshipsToCreate,
	upsert,
) => {
	const { properties: validProperties } = getType(nodeType);

	const relationshipParameters = {};
	const relationshipQueries = [];

	// Note on the limitations of cypher:
	// It would be so nice to use UNWIND to create all these from a list parameter,
	// but unfortunately parameters cannot be used to specify relationship labels
	// so for every relatinship type we need to append a fragment of cypher
	Object.entries(relationshipsToCreate).forEach(([relType, relProps]) => {
		const relationshipSchema = validProperties[relType];
		const {
			type: relatedType,
			direction,
			relationship,
		} = relationshipSchema;

		const relDefsKey = `${relationship}${direction}${relatedType}`;

		const relDefs = [];

		relProps.forEach(relProp => {
			const props = { ...relProp };
			delete relDefs.push({
				code: relProp.code,
				props,
			});
		});

		relationshipParameters[relDefsKey] = relDefs;

		// Uses OPTIONAL MATCH for upsert because it returns [null]
		// rather than [] if the node doesn't exist
		// This means the next line tries to create a relationship pointing
		// at null, so we get an informative error
		relationshipQueries.push(
			stripIndents`
			WITH DISTINCT node
			UNWIND $${relDefsKey} as relDefs
			${
				upsert ? 'MERGE' : 'OPTIONAL MATCH'
			} (related:${relatedType} {code: relDefs.code})
			${upsert ? `ON CREATE SET ${metaPropertiesForCreate('related')}` : ''}
			WITH DISTINCT node, related, relDefs
			MERGE ${relationshipFragmentWithEndNodes('node', relationshipSchema, 'related')}
				ON CREATE SET ${metaPropertiesForCreate(
					'relationship',
				)}, relationship += relDefs.props
				ON MATCH SET ${metaPropertiesForUpdate(
					'relationship',
				)}, relationship += relDefs.props
		`,
		);

		if (relationshipSchema.hasMany) {
			const { properties: relatedProperties } = getType(relatedType);
			const inverseProperties = findInversePropertyNames(
				nodeType,
				relType,
			);
			if (
				inverseProperties.some(
					inverseProperty =>
						relatedProperties[inverseProperty] &&
						!relatedProperties[inverseProperty].hasMany,
				)
			) {
				// TODO - send an update event for this
				relationshipQueries.push(
					stripIndents`
				WITH DISTINCT node, related
				OPTIONAL MATCH ${relationshipFragmentWithEndNodes(
					'otherNode',
					relationshipSchema,
					'related',
					'conflictingRelationship',
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
				WITH DISTINCT node
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

const MISSING_RELATED_NODE_REGEX = /Failed to create relationship ` {2}relationship@(\d+)`, node ` {2}related@(\d+)` is missing./;

const handleUpsertError = err => {
	if (MISSING_RELATED_NODE_REGEX.test(err.message)) {
		throw httpErrors(
			400,
			stripIndents`Missing related node.
			If you need to create multiple things which depend on each other,
			use the \`upsert=true\` query string to create placeholder entries for
			related things which can be populated with properties with subsequent
			API calls.
			DO NOT use \`upsert\` if you are attempting to create a relationship with
			an item that already exists - there's probably a mistake somewhere in your
			code`,
		);
	}
};

module.exports = {
	prepareToWriteRelationships,
	prepareRelationshipDeletion,
	handleUpsertError,
};

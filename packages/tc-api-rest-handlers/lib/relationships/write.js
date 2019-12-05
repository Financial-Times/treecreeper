const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const {
	getType,
	findInversePropertyNames,
} = require('@financial-times/tc-schema-sdk');
const {
	metaPropertiesForCreate,
	createRelMetaQueryForUpdate,
} = require('../metadata-helpers');

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

const addPropsToQueries = (relationshipPropQueries, value) => {
	// value: { code: 'node code', someProp: 'some property'...}
	Object.entries(value).forEach(([k, v]) => {
		if (k !== 'code') {
			// If no node matches the CASE expression, the expression returns a null.
			// and no action will be taken
			relationshipPropQueries.push(`
				SET (CASE
				WHEN related.code = '${value.code}'
				THEN relationship END).${k} = ${v === null ? null : `'${v}'`}
				`);
			relationshipPropQueries.push(
				createRelMetaQueryForUpdate(value.code),
			);
		}
	});
};

const prepareToWriteRelationships = (
	nodeType,
	relationshipsToCreate,
	upsert,
) => {
	const { properties: validProperties } = getType(nodeType);

	const relationshipParameters = {};
	const relationshipQueries = [];

	Object.entries(relationshipsToCreate).forEach(([relType, relProps]) => {
		const relDef = validProperties[relType];
		const { type: relatedType, direction, relationship } = relDef;
		const key = `${relationship}${direction}${relatedType}`;

		const retrievedCodes = [];
		const relationshipPropQueries = [];

		relProps.forEach(relProp => {
			retrievedCodes.push(relProp.code);
			addPropsToQueries(relationshipPropQueries, relProp);
		});

		// make sure the parameter referenced in the query exists on the
		// globalParameters object passed to the db driver
		Object.assign(relationshipParameters, {
			[key]: retrievedCodes,
		});

		// Note on the limitations of cypher:
		// It would be so nice to use UNWIND to create all these from a list parameter,
		// but unfortunately parameters cannot be used to specify relationship labels
		relationshipQueries.push(
			stripIndents`
			WITH node
			${locateRelatedNodes(relDef, key, upsert)}
			WITH node, related
			MERGE ${relationshipFragmentWithEndNodes('node', relDef, 'related')}
				ON CREATE SET ${metaPropertiesForCreate('relationship')}
			${relationshipPropQueries.join('')}
		`,
		);

		if (relDef.hasMany) {
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
				relationshipQueries.push(
					stripIndents`
				WITH node, related
				OPTIONAL MATCH ${relationshipFragmentWithEndNodes(
					'otherNode',
					relDef,
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

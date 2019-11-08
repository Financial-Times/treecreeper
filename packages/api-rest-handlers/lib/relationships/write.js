const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const { getType } = require('../../../../packages/schema-sdk');
const { metaPropertiesForCreate } = require('../metadata-helpers');
const { findInversePropertyNames } = require('./properties');

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
			// hack: CASE statement to either return an empty list or a list with one element.
			// That result is passed to a FOREACH loop.
			// If the result is an empty list, then the FOREACH clause won’t execute (because there’s nothing to iterate over.)
			// If the result is a list with one element, then the FOREACH clause will execute once (because it iterated over one element.)
			relationshipPropQueries.push(`
				FOREACH (target in CASE related.code
					WHEN '${value.code}' THEN [1]
					ELSE [] END | SET relationship.${k} = '${v}')
					`);
		}
	});
};

const prepareToWriteRelationships = (
	nodeType,
	relationshipsToCreate,
	upsert,
	parameters,
) => {
	const { properties: validProperties } = getType(nodeType);

	const relationshipParameters = {};
	const relationshipQueries = [];
	const replaceObjects = {};

	Object.entries(relationshipsToCreate).forEach(([propName, values]) => {
		const propDef = validProperties[propName];
		const { type: relatedType, direction, relationship } = propDef;
		const key = `${relationship}${direction}${relatedType}`;

		const retrievedCodes = [];
		const relationshipPropQueries = [];
		let propValueType;

		// values could be just an array of strings(codes), objects(code and properties) or mixed
		values.forEach(value => {
			propValueType = typeof value;
			if (propValueType === 'string') {
				retrievedCodes.push(value);
			} else {
				retrievedCodes.push(value.code);
				addPropsToQueries(relationshipPropQueries, value);
			}
		});

		// neo4j driver only accept primitive types or arrays thereof
		// store an array of codes here to replace relationship values in parameters later
		if (propValueType === 'object') {
			replaceObjects[propName] = retrievedCodes;
		}

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
			${locateRelatedNodes(propDef, key, upsert)}
			WITH node, related
			MERGE ${relationshipFragmentWithEndNodes('node', propDef, 'related')}
				ON CREATE SET ${metaPropertiesForCreate('relationship')}
			${relationshipPropQueries.join('')}
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

	// neo4j driver only accept primitive types or arrays thereof
	// need to replace objects in parameters to an array of codes
	if (Object.keys(replaceObjects).length) {
		Object.assign(relationshipParameters, {
			properties: { ...parameters.properties, ...replaceObjects },
		});
	}

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
const assert = require('assert');
const sdk = require('../sdk');

const validateRelationshipConsistency = () => {
	const types = sdk.rawData.getTypes();

	const relationships = types.flatMap(({ name, properties }) =>
		Object.entries(properties)
			.filter(
				([, propDef]) =>
					!propDef.deprecationReason && !!propDef.relationship,
			)
			.map(([propName, propDef]) => ({
				homeType: name,
				awayType: propDef.type,
				propName,
				from: propDef.direction === 'outgoing' ? name : propDef.type,
				to: propDef.direction === 'outgoing' ? propDef.type : name,
				relationship: propDef.relationship,
				direction: propDef.direction,
			})),
	);

	const failures = [];

	while (relationships.length) {
		const thisRel = relationships.shift();
		const twin = relationships.find(
			otherRel =>
				otherRel.awayType === thisRel.homeType &&
				otherRel.homeType === thisRel.awayType &&
				otherRel.relationship === thisRel.relationship,
		);

		if (twin) {
			relationships.splice(relationships.indexOf(twin), 1);
		} else {
			failures.push(thisRel);
		}
	}

	if (failures.length) {
		failures.forEach(failure => {
			console.error("Relationship property without a 'twin'", failure);
		});
		assert.fail(
			'Some types have relationship properties that do not have a twin pointing in the opposite direction',
		);
	}

	const relationshipTypes = sdk.rawData.getRelationshipTypes();

	const getRelationshipPropDefs = (type, relationshipTypeName) => {
		const { properties } = types.find(({ name }) => name === type);
		const propDefs = Object.values(properties).filter(
			propDef => propDef.type === relationshipTypeName,
		);
		return propDefs;
	};

	// Check all relationshipTypes are referenced from both ends
	// Check each relationship defines direction in one place only: on the relationshipType if not reflexive, otherwise on the type
	relationshipTypes.forEach(({ name: relationshipTypeName, from, to }) => {
		if (from.type === to.type) {
			const propDefs = getRelationshipPropDefs(
				from.type,
				relationshipTypeName,
			);
			assert.equal(
				propDefs.length,
				2,
				`${relationshipTypeName} should be used by 2 properties of ${from.type}`,
			);
			assert.ok(
				propDefs.find(propDef => propDef.direction === 'outgoing'),
				`${relationshipTypeName} should be used alongside \`direction: 'outgoing'\` by 1 property of ${from.type}`,
			);
			assert.ok(
				propDefs.find(propDef => propDef.direction === 'incoming'),
				`${relationshipTypeName} should be used alongside \`direction: 'incoming'\` by 1 property of ${from.type}`,
			);
		} else {
			const fromPropDefs = getRelationshipPropDefs(
				from.type,
				relationshipTypeName,
			);
			const toPropDefs = getRelationshipPropDefs(
				to.type,
				relationshipTypeName,
			);

			assert.equal(
				fromPropDefs.length,
				1,
				`${relationshipTypeName} should be used by a property of ${from.type}`,
			);
			assert.equal(
				toPropDefs.length,
				1,
				`${relationshipTypeName} should be used by a property of ${to.type}`,
			);
			assert.ok(
				!('direction' in fromPropDefs[0]),
				`Should not specify direction where ${relationshipTypeName} is used in ${from.type}`,
			);
			assert.ok(
				!('direction' in toPropDefs[0]),
				`Should not specify direction where ${relationshipTypeName} is used in ${to.type}`,
			);
		}
	});
};

module.exports = { validateRelationshipConsistency };

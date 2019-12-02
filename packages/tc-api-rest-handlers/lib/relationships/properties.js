const { getType } = require('@financial-times/tc-schema-sdk');

const invertDirection = direction =>
	direction === 'incoming' ? 'outgoing' : 'incoming';

const findPropertyNames = ({
	rootType,
	direction,
	relationship,
	destinationType,
}) =>
	Object.entries(getType(rootType).properties)
		.filter(
			([, def]) =>
				def.type === destinationType &&
				def.relationship === relationship &&
				def.direction === direction,
		)
		.map(([propName]) => propName)
		.sort();

const findInversePropertyNames = (rootType, propName) => {
	const { type, relationship, direction } = getType(rootType).properties[
		propName
	];
	return findPropertyNames({
		rootType: type,
		direction: invertDirection(direction),
		relationship,
		destinationType: rootType,
	});
};

const retrieveRelationshipCodes = (relType, content) =>
	content[relType] && content[relType].map(relationship => relationship.code);

module.exports = {
	invertDirection,
	findPropertyNames,
	findInversePropertyNames,
	retrieveRelationshipCodes,
};

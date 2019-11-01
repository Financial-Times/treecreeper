const { getType } = require('../../../../packages/schema-sdk');

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

module.exports = {
	invertDirection,
	findPropertyNames,
	findInversePropertyNames,
};

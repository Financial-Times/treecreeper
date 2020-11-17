const invertDirection = direction =>
	direction === 'incoming' ? 'outgoing' : 'incoming';

const findPropertyNamesFromPropertyDef = function ({
	rootType,
	direction,
	relationship,
	destinationType,
}) {
	return Object.entries(this.getType(rootType).properties)
		.filter(
			([, def]) =>
				def.type === destinationType &&
				def.relationship === relationship &&
				def.direction === direction,
		)
		.map(([propName]) => propName)
		.sort();
};

const findInversePropertyNames = function (rootType, propName) {
	const { type, relationship, direction } = this.getType(rootType).properties[
		propName
	];
	return this.findPropertyNamesFromPropertyDef({
		rootType: type,
		direction: invertDirection(direction),
		relationship,
		destinationType: rootType,
	});
};

const findPropertyNames = function (rootType, propName) {
	const { type, relationship, direction } = this.getType(rootType).properties[
		propName
	];

	if (!relationship) {
		return [propName];
	}

	return this.findPropertyNamesFromPropertyDef({
		rootType,
		direction,
		relationship,
		destinationType: type,
	});
};

module.exports = {
	invertDirection,
	findPropertyNames,
	findInversePropertyNames,
	findPropertyNamesFromPropertyDef,
};

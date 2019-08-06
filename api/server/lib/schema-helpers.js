const schema = require('@financial-times/biz-ops-schema');

const invertDirection = direction =>
	direction === 'incoming' ? 'outgoing' : 'incoming';

const findPropertyNames = ({
	rootType,
	direction,
	relationship,
	destinationType,
}) =>
	Object.entries(schema.getType(rootType).properties)
		.filter(
			([, def]) =>
				def.type === destinationType &&
				def.relationship === relationship &&
				def.direction === direction,
		)
		.map(([propName]) => propName)
		.sort();

module.exports = {
	findPropertyNames,
	findInversePropertyNames: (rootType, propName) => {
		const { type, relationship, direction } = schema.getType(
			rootType,
		).properties[propName];
		return findPropertyNames({
			rootType: type,
			direction: invertDirection(direction),
			relationship,
			destinationType: rootType,
		});
	},
	invertDirection,
	addRecursiveProperties: (propNames, nodeType) => {
		const { properties } = schema.getType(nodeType);
		return []
			.concat(
				...propNames.map(name => {
					const {
						isRelationship,
						type,
						relationship,
						direction,
					} = properties[name];
					return isRelationship
						? findPropertyNames({
								rootType: nodeType,
								direction,
								relationship,
								destinationType: type,
						  })
						: [name];
				}),
			)
			.filter(name => !!name);
	},
};

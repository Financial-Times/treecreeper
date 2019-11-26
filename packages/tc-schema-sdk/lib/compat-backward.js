const deepFreeze = require('deep-freeze');

const transformProperties = (types, type) => {
	const { properties } = type;
	return Object.entries(properties).reduce((props, [propName, propDef]) => {
		const relType = types.find(rootType => propDef.type === rootType.name);
		if (!relType) {
			return {
				...props,
				[propName]: propDef,
			};
		}
		const { from, to, relationship } = relType;
		let direction;
		let relationshipTo;
		let hasMany;
		if (propDef.direction !== 'to' && from.type === type.name) {
			direction = 'outgoing';
			relationshipTo = to.type;
			hasMany = from.hasMany;
		} else {
			direction = 'incoming';
			relationshipTo = from.type;
			hasMany = to.hasMany;
		}
		return {
			...props,
			[propName]: {
				...propDef,
				relationship,
				type: relationshipTo,
				description: propDef.description,
				label: propDef.label,
				direction,
				hasMany,
			},
		};
	}, {});
};

const compatBackward = types => {
	return types.reduce((compat, type) => {
		if ('to' in type && 'from' in type) {
			return compat;
		}
		compat.push(
			deepFreeze({
				...type,
				properties: transformProperties(types, type),
			}),
		);
		return compat;
	}, []);
};

module.exports = {
	compatBackward,
};

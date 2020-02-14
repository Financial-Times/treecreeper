const {
	getEnums,
	getTypes,
	getPrimitiveTypes,
} = require('@financial-times/tc-schema-sdk');

module.exports = ({ customComponents = {}, customTypeMappings = {} } = {}) => ({
	type,
	hasMany,
}) => {
	// TO Do - don't require in here
	// eslint-disable-next-line global-require
	const primitives = require('../../primitives/server');
	const components = { ...primitives, ...customComponents };
	const typeToComponentMap = {
		...getPrimitiveTypes({ output: 'component' }),
		...Object.keys(customComponents).reduce(
			(map, name) => ({ ...map, [name]: name }),
			{},
		),
		...customTypeMappings,
	};

	const objectTypes = getTypes().map(objectType => objectType.name);

	if (type) {
		if (typeToComponentMap[type]) {
			return components[typeToComponentMap[type]];
		}
		if (getEnums()[type]) {
			return hasMany ? components.MultipleChoice : components.Enum;
		}
		if (objectTypes.includes(type)) {
			return components.Relationship;
		}
	}

	return components.Text;
};

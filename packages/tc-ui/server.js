const {
	getEnums,
	getTypes,
	getPrimitiveTypes,
} = require('@financial-times/tc-schema-sdk');
const primitives = require('./primitives/server');

const componentAssigner = ({
	customComponents = {},
	customTypeMappings = {},
} = {}) => itemType => {
	const components = { ...primitives, ...customComponents };

	const primitiveTypes = {
		...getPrimitiveTypes({ output: 'component' }),
		...customTypeMappings,
	};
	const objectTypes = getTypes().map(type => type.name);
	if (itemType) {
		if (getEnums()[itemType]) {
			return components.Enum;
		}
		if (primitiveTypes[itemType]) {
			return components[primitiveTypes[itemType]];
		}
		if (objectTypes.includes(itemType)) {
			return components.Relationship;
		}
	}

	return components.Text;
};

module.exports = {
	primitives,
	componentAssigner,
};

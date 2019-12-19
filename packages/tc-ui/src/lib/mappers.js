const {
	getEnums,
	getTypes,
	getType,
	getPrimitiveTypes,
} = require('@financial-times/tc-schema-sdk');
const primitives = require('../primitives/server');

const componentAssigner = ({
	customComponents = {},
	customTypeMappings = {},
} = {}) => propType => {
	const components = { ...primitives, ...customComponents };

	const primitiveTypes = {
		...getPrimitiveTypes({ output: 'component' }),
		...customTypeMappings,
	};
	const objectTypes = getTypes().map(type => type.name);
	if (propType) {
		if (getEnums()[propType]) {
			return components.Enum;
		}
		if (primitiveTypes[propType]) {
			return components[primitiveTypes[propType]];
		}
		if (objectTypes.includes(propType)) {
			return components.Relationship;
		}
	}

	return components.Text;
};

const toGraphql = (propName, propDef, assignComponent) =>
	assignComponent(propDef.type).graphqlFragment(propName, propDef);

const graphqlQueryBuilder = (type, assignComponent) => {
	return `
	query getStuff($itemId: String!) {
    ${type} (code: $itemId) {
    ${Object.entries(getType(type, { includeMetaFields: true }).properties)
		.map(([propName, propDef]) =>
			toGraphql(propName, propDef, assignComponent),
		)
		.join('\n')}
  }
}
`;
};

module.exports = { componentAssigner, graphqlQueryBuilder };

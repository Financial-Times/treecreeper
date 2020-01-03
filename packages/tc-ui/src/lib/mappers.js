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

	const typeToComponentMap = {
		...getPrimitiveTypes({ output: 'component' }),
		...Object.keys(customComponents).reduce(
			(map, name) => ({ ...map, [name]: name }),
			{},
		),
		...customTypeMappings,
	};

	const objectTypes = getTypes().map(type => type.name);
	if (propType) {
		if (typeToComponentMap[propType]) {
			return components[typeToComponentMap[propType]];
		}
		if (getEnums()[propType]) {
			return components.Enum;
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
		.filter(([, { deprecationReason }]) => !deprecationReason)
		.map(([propName, propDef]) =>
			toGraphql(propName, propDef, assignComponent),
		)
		.join('\n')}
  }
}
`;
};

module.exports = { componentAssigner, graphqlQueryBuilder };

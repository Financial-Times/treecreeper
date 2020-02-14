const schema = require('@financial-times/tc-schema-sdk');

const toGraphql = (propName, propDef, assignComponent) =>
	assignComponent(propDef).graphqlFragment(propName, propDef);

module.exports = (type, assignComponent) => `
	query getStuff($itemId: String!) {
    ${type} (code: $itemId) {
    ${Object.entries(
		schema.getType(type, { includeMetaFields: true }).properties,
	)
		.filter(([, { deprecationReason }]) => !deprecationReason)
		.map(([propName, propDef]) =>
			toGraphql(propName, propDef, assignComponent),
		)
		.join('\n')}
  }
}
`;

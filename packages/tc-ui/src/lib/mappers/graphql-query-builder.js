const schema = require('@financial-times/tc-schema-sdk');

const toGraphql = (propName, propDef, assignComponent) =>
	assignComponent(propDef).graphqlFragment(propName, propDef);

const graphqlQueryBuilder = (type, assignComponent) => `
	query getStuff($itemId: String!) {
    ${type} (code: $itemId) {
    ${Object.entries(
		schema.getType(type, {
			includeMetaFields: true,
			includeSyntheticFields: false,
		}).properties,
	)
		.filter(([, { deprecationReason }]) => !deprecationReason)
		.map(([propName, propDef]) =>
			toGraphql(propName, propDef, assignComponent),
		)
		.join('\n')}
  }
}
`;

module.exports = { graphqlQueryBuilder };

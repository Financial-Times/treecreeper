module.exports = Object.assign({
	getType: require('./methods/get-type').method,
	getTypes: require('./methods/get-types').method,
	getStringPattern: name => RegExp,
	getEnum: enumType => ({}),
	getEnums: () => [],
	getFilterFields: type => [],
	getIdentifierFields: type => [],
	getGraphQLSchema: () => '',
	getRelationship: () => 'TBD',
	graphqlDefs: require('./graphql/generate-graphql-defs')
}, require('./lib/validate'))

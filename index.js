module.exports = Object.assign(
	{
		getType: require('./methods/get-type').method,
		getTypes: require('./methods/get-types').method,
		getRelationships: require('./methods/get-relationships').method,
		// getStringPattern: name => RegExp,
		// getEnum: enumType => ({}),
		getEnums: require('./methods/get-enums').method,
		// getFilterFields: type => [],
		// getIdentifierFields: type => [],
		// getGraphQLSchema: () => '',

		graphqlDefs: require('./graphql/generate-graphql-defs')
	},
	require('./lib/validate')
);

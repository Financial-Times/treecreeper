module.exports = Object.assign(
	{
		getType: require('./methods/get-type').method,
		getTypes: require('./methods/get-types').method,
		getRelationships: require('./methods/get-relationships').method,
		getEnums: require('./methods/get-enums').method,
		graphqlDefs: require('./lib/generate-graphql-defs')
	},
	require('./lib/validate')
);

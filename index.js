module.exports = Object.assign(
	{
		getType: require('./methods/get-type').method,
		getTypes: require('./methods/get-types').method,
		getRelationships: require('./methods/get-relationships').method,
		getEnums: require('./methods/get-enums').method,
		getGraphqlDefs: require('./methods/get-graphql-defs').method
	},
	require('./lib/validate')
);

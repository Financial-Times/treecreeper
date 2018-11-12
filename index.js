module.exports = Object.assign(
	{
		getType: require('./methods/get-type').method,
		getTypes: require('./methods/get-types').method,
		getEnums: require('./methods/get-enums').method,
		getGraphqlDefs: require('./methods/get-graphql-defs').method,
		normalizeTypeName: name => name,
		primitiveTypesMap: require('./lib/primitive-types-map')
	},
	require('./lib/validate')
);

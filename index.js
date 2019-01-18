module.exports = Object.assign(
	{
		getType: require('./methods/get-type'),
		getTypes: require('./methods/get-types'),
		getEnums: require('./methods/get-enums'),
		getGraphqlDefs: require('./methods/get-graphql-defs'),
		normalizeTypeName: name => name,
		primitiveTypesMap: require('./lib/primitive-types-map'),
	},
	require('./lib/validate'),
);

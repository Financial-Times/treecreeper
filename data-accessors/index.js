const type = require('./type');
const graphqlDefs = require('./graphql-defs');
const enums = require('./enums');

const createCachedMethod = ({ accessor, cacheKeyHelper }, rawData) => {
	return rawData.cache.cacheify(accessor.bind(null, rawData), cacheKeyHelper);
};

module.exports = rawData => {
	const getType = createCachedMethod(type, rawData);
	const getEnums = createCachedMethod(enums, rawData);
	const getTypes = createCachedMethod(
		{
			accessor: (boundRawData, options) =>
				boundRawData
					.getTypes()
					.map(({ name }) => getType(name, options)),
			cacheKeyHelper: options => type.cacheKeyHelper('all', options),
		},
		rawData,
	);

	return {
		getType,
		getEnums,
		getTypes,
		// not cached as it's used once in a blue moon in the api,
		// and only just after the cache has been cleared
		getGraphqlDefs: graphqlDefs(getTypes, getEnums),
	};
};

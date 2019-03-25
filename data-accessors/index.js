const type = require('./type');
const graphqlDefs = require('./graphql-defs');
const stringValidator = require('./string-validator');
const enums = require('./enums');
const types = require('./types');

const createCachedAccessor = (
	{ accessor, cacheKeyGenerator },
	rawData,
	...moreBoundArgs
) =>
	rawData.cache.cacheify(
		accessor.bind(null, rawData, ...moreBoundArgs),
		cacheKeyGenerator,
	);

module.exports = rawData => {
	const getStringValidator = createCachedAccessor(stringValidator, rawData);
	const getType = createCachedAccessor(type, rawData, getStringValidator);
	const getEnums = createCachedAccessor(enums, rawData);
	const getTypes = createCachedAccessor(types, rawData, getType);

	return {
		getType,
		getEnums,
		getTypes,
		// not cached as it's used once in a blue moon in the api,
		// and only just after the cache has been cleared
		getGraphqlDefs: graphqlDefs(getTypes, getEnums),
	};
};

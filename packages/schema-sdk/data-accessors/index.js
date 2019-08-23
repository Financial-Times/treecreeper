const primitiveTypes = require('../primitive-types-map');
const type = require('./type');
const graphqlDefs = require('./graphql-defs');
const stringValidator = require('./string-validator');
const enums = require('./enums');
const types = require('./types');

/**
Probably the most functional magic in this entire package

- accessor = a function that reads data from the rawSchemaData (which is an
	instance of the RawData class), enriches it and returns the enriched schema
	object for use by the application
- cacheKeyGenerator = a function which has a similar signature as accessor
	(but ommitting the first 1 or more parameters) and returns a string, which
	is used to retrieve results from the in memory cache for calls to accessor
	that match previous ones

What make things complex is that accessor needs access to rawData (and sometimes
other things too), but we don't want the end user to have to manually pass this
around. This is why `.bind(null, rawSchemaData)` is used to populate the first
parameter of accessor.

e.g. an accessor which to the end user looks like `getEnums(options)` is
actually a pair of functions
- accessor(rawSchemaData, options)
- cacheKeyGenerator(options)

accessor.bind(null, rawSchemaData) returns a function with the signature
boundAccessor(options)

rawSchemaData.cache.addCacheToFunction returns a function with the signature
boundAndCacheEnabledAccessor(options)

This is what's finally exposed to the end user

TODO - consider moving away from using bind towards functions that return functions

* */
const createCachedAccessor = (
	{ accessor, cacheKeyGenerator },
	rawSchemaData,
	...moreBoundArgs
) =>
	rawSchemaData.cache.addCacheToFunction(
		accessor.bind(null, rawSchemaData, ...moreBoundArgs),
		cacheKeyGenerator,
	);

module.exports = rawSchemaData => {
	const getStringValidator = createCachedAccessor(
		stringValidator,
		rawSchemaData,
	);
	const getType = createCachedAccessor(
		type,
		rawSchemaData,
		getStringValidator,
	);
	const getEnums = createCachedAccessor(enums, rawSchemaData);
	const getTypes = createCachedAccessor(types, rawSchemaData, getType);

	return {
		getType,
		getEnums,
		getTypes,
		getPrimitiveTypes: () => primitiveTypes,
		// not cached as it's very infrequently, when constructing the graophql api,
		// and only just after the cache has been cleared
		getGraphqlDefs: graphqlDefs(getTypes, getEnums),
	};
};

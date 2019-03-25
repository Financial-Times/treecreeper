const type = require('./type');
const graphqlDefs = require('./graphql-defs');
const stringValidator = require('./string-validator');
const enums = require('./enums');
const types = require('./types');

const createCachedMethod = ({ accessor, cacheKeyHelper }, rawData, ...args) =>
	rawData.cache.cacheify(
		accessor.bind(null, rawData, ...args),
		cacheKeyHelper,
	);

module.exports = rawData => {
	const getStringValidator = createCachedMethod(stringValidator, rawData);
	const getType = createCachedMethod(type, rawData, getStringValidator);
	const getEnums = createCachedMethod(enums, rawData);
	const getTypes = createCachedMethod(types, rawData, getType);

	return {
		getType,
		getEnums,
		getTypes,
		// not cached as it's used once in a blue moon in the api,
		// and only just after the cache has been cleared
		getGraphqlDefs: graphqlDefs(getTypes, getEnums),
	};
};

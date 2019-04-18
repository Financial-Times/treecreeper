const type = require('./type');

module.exports = {
	accessor: (rawData, getType, options) =>
		rawData.getTypes().map(({ name }) => getType(name, options)),
	cacheKeyGenerator: options => type.cacheKeyGenerator('all', options),
};

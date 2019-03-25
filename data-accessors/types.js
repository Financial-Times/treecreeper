const type = require('./type');

module.exports = {
	accessor: (rawData, getType, options) =>
		rawData.getTypes().map(({ name }) => getType(name, options)),
	cacheKeyHelper: options => type.cacheKeyHelper('all', options),
};

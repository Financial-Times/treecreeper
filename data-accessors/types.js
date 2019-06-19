const type = require('./type');

module.exports = {
	// todo move to object rest parameters for options when upgrading node
	accessor: (rawData, getType, options) => {
		const hierarchy = rawData.getTypeHierarchy();
		const groupTypes = options.groupTypes || false;

		return hierarchy.reduce((result, {name, description, types}) => {
			types = types.map(type => getType(name, options));
			return groupTypes ? result.concat({name, description, types}) : result.concat(types)
		}, []);

		rawData.getTypes().map(({ name }) => getType(name, options)),
	}
	// todo move to object rest parameters for options when upgrading node
	cacheKeyGenerator: options => {
		const groupTypes = options.groupTypes || false;
		return `${groupTypes}:${type.cacheKeyGenerator('all', options)}`
	},
};

const type = require('./type');

module.exports = {
	// todo move to object rest parameters for options when upgrading node
	accessor: (rawData, getType, options) => {
		const hierarchy = rawData.getTypeHierarchy();
		const structure = options.structure || 'flat';

		return hierarchy.reduce((result, {name, description, types}) => {
			types = types.map(type => getType(name, options));
			return structure === 'flat' ? result.concat(types) : result.concat({name, description, types})
		}, []);

		rawData.getTypes().map(({ name }) => getType(name, options)),
	}
	// todo move to object rest parameters for options when upgrading node
	cacheKeyGenerator: options => {
		const structure = options.structure || 'flat';
		return `${structure}:${type.cacheKeyGenerator('all', options)}`
	},
};

const type = require('./type');

module.exports = {
	// todo move to object rest parameters for options when upgrading node
	accessor: (rawData, getType, options = {}) => {
		const hierarchy = rawData.getTypeHierarchy();
		const groupTypes = options.groupTypes || false;
		if (!hierarchy) {
			return rawData.getTypes().map(({ name }) => getType(name, options));
		}

		if (!groupTypes) {
			return [].concat(
				...Object.values(hierarchy).map(({ types }) =>
					types.map(name => getType(name, options)),
				),
			);
		}

		return Object.entries(hierarchy).reduce(
			(result, [categoryName, { label, description, types }]) => {
				types = types.map(name => getType(name, options));
				return Object.assign(result, {
					[categoryName]: { label, description, types },
				});
			},
			{},
		);
	},
	// todo move to object rest parameters for options when upgrading node
	cacheKeyGenerator: (options = {}) => {
		const groupTypes = options.groupTypes || false;
		return `${groupTypes}:${type.cacheKeyGenerator('all', options)}`;
	},
};

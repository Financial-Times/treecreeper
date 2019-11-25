const type = require('./type');

module.exports = {
	// todo move to object rest parameters for options when upgrading node
	accessor(options = {}) {
		const hierarchy = this.rawData.getTypeHierarchy();
		const grouped = options.grouped || false;
		if (!hierarchy) {
			return this.rawData
				.getTypes()
				.map(({ name }) => this.getType(name, options));
		}

		if (!grouped) {
			return [].concat(
				...Object.values(hierarchy).map(({ types, relationships }) =>
					types
						.concat(relationships || [])
						.map(name => this.getType(name, options)),
				),
			);
		}

		return Object.entries(hierarchy).reduce(
			(
				result,
				[categoryName, { label, description, types, relationships }],
			) => {
				types = types
					.concat(relationships || [])
					.map(name => this.getType(name, options));
				return Object.assign(result, {
					[categoryName]: { label, description, types },
				});
			},
			{},
		);
	},
	// todo move to object rest parameters for options when upgrading node
	cacheKeyGenerator: (options = {}) => {
		const grouped = options.grouped || false;
		return `${grouped}:${type.cacheKeyGenerator('all', options)}`;
	},
};

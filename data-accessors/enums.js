const mapToObjectResolver = keys =>
	keys.reduce((resolver, key) => Object.assign(resolver, { [key]: key }), {});

module.exports = {
	accessor: (rawData, { withMeta = false } = {}) => {
		return Object.entries(rawData.getEnums()).reduce(
			(map, [key, { options, description }]) => {
				options = Array.isArray(options)
					? mapToObjectResolver(options)
					: options;
				const entry = withMeta
					? {
							options,
							description,
					  }
					: options;

				return Object.assign(map, { [key]: entry });
			},
			{},
		);
	},
	cacheKeyHelper: ({ withMeta = false } = {}) => `enums: ${withMeta}`,
};

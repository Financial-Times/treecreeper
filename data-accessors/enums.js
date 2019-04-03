const mapToObjectResolver = options =>
	options.reduce(
		(resolver, option) =>
			Object.assign(resolver, { [option.value]: option.description }),
		{},
	);

module.exports = {
	cacheKeyGenerator: ({ withMeta = false } = {}) => `enums:${withMeta}`,
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
};

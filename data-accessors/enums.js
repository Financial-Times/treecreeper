const convertArrayToOject = (options, withMeta) => {
	return options.reduce((resolver, option) => {
		if (withMeta) {
			return Object.assign(resolver, { [option]: { value: option } });
		}
		return Object.assign(resolver, { [option]: option });
	}, {});
};

const restructureOptions = (options, withMeta) => {
	if (Array.isArray(options)) {
		return convertArrayToOject(options, withMeta);
	}

	if (withMeta) {
		return Object.entries(options).reduce((resolver, [key, value]) => {
			return Object.assign(resolver, {
				[key]: { value: key, description: value },
			});
		}, {});
	}

	return options;
};

module.exports = {
	cacheKeyGenerator: ({ withMeta = false } = {}) => `enums:${withMeta}`,
	accessor: (rawData, { withMeta = false } = {}) => {
		return Object.entries(rawData.getEnums()).reduce(
			(map, [key, { options, description }]) => {
				options = restructureOptions(options, withMeta);
				const entry = withMeta
					? {
							description,
							options,
					  }
					: options;

				return Object.assign(map, { [key]: entry });
			},
			{},
		);
	},
};

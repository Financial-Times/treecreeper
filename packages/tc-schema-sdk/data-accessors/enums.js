const restructureOptions = (options, withMeta) => {
	let optionsArray;
	if (Array.isArray(options)) {
		optionsArray = options.map(value => ({
			value,
		}));
	} else {
		optionsArray = Object.entries(options).map(([value, description]) => ({
			value,
			description,
		}));
	}

	if (withMeta) {
		return optionsArray.reduce(
			(result, option) =>
				Object.assign(result, { [option.value]: option }),
			{},
		);
	}
	return optionsArray.reduce(
		(result, option) =>
			Object.assign(result, { [option.value]: option.value }),
		{},
	);
};

module.exports = {
	cacheKeyGenerator: ({ withMeta = false } = {}) => `enums:${withMeta}`,
	accessor({ withMeta = false } = {}) {
		return Object.entries(this.rawData.getEnums() || {})
			.filter(({isTest}) => !isTest || this.includeTestDefinitions)
			.reduce(
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

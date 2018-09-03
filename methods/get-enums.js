const rawData = require('../lib/raw-data');
const cache = require('../lib/cache');

const mapToObjectResolver = keys =>
	keys.reduce((resolver, key) => Object.assign(resolver, { [key]: key }), {});

module.exports.method = ({ withMeta = false } = {}) => {
	let enums = cache.get('enums', withMeta);
	if (!enums) {
		enums = Object.entries(rawData.getEnums()).reduce(
			(map, [key, { options, description }]) => {
				options = Array.isArray(options)
					? mapToObjectResolver(options)
					: options;
				const entry = withMeta
					? {
							options,
							description
					  }
					: options;

				return Object.assign(map, { [key]: entry });
			},
			{}
		);
		cache.set('enums', withMeta, enums);
	}
	return enums;
};

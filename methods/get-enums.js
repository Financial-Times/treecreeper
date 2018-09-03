const rawData = require('../lib/raw-data');
const cache = require('../lib/cache');

const mapToObjectResolver = keys =>
	keys.reduce((resolver, key) => Object.assign(resolver, { [key]: key }), {});

module.exports.method = () => {
	let enums = cache.get('enums', 'all');
	if (!enums) {
		enums = Object.entries(rawData.getEnums()).reduce(
			(map, [key, { options, description }]) =>
				Object.assign(map, {
					[key]: {
						options: Array.isArray(options) ? mapToObjectResolver(options) : options,
						description
					}
				}),
			{}
		);
		cache.set('enums', 'all', enums);
	}
	return enums;
};

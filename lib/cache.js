let cache = {};

const clear = () => (cache = {});

module.exports = {
	clear,
	cacheify: (func, keyFunc) => (...args) => {
		const key = keyFunc(...args);
		if (key in cache) {
			return cache[key];
		}
		const val = func(...args);
		cache[key] = val;
		return val;
	}
};

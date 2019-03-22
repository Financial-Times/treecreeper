const deepFreeze = require('deep-freeze');

class Cache {
	constructor() {
		this.cache = {};
	}

	clear() {
		this.cache = {};
		return this.cache;
	}

	cacheify(func, keyFunc) {
		return (...args) => {
			const key = keyFunc(...args);
			if (key in this.cache) {
				return this.cache[key];
			}
			const val = func(...args);
			this.cache[key] = deepFreeze(val);
			return val;
		};
	}
}

module.exports = Cache;

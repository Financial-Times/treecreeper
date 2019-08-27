const deepFreeze = require('deep-freeze');

class Cache {
	constructor() {
		this.cache = {};
	}

	clear() {
		this.cache = {};
		return this.cache;
	}

	addCacheToFunction(func, keyFunc) {
		return (...args) => {
			const key = keyFunc(...args);
			if (key in this.cache) {
				return this.cache[key];
			}
			const val = func(...args);
			this.cache[key] = val ? deepFreeze(val) : null;
			return val;
		};
	}
}

module.exports = { Cache };

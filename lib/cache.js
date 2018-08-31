let cache = {};

const getNamespace = namespace => {
	cache[namespace] = cache[namespace] || {}
	return cache[namespace];
}

const set = (namespace, key, val) => getNamespace(namespace)[key] = val;

const get = (namespace, key, val) => getNamespace(namespace)[key];

const clear = () => cache = {};

module.exports = {
	getNamespace,
	set,
	get,
	clear
}

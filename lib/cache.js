const cache = {};

const getNamespace = namespace => {
	cache[namespace] = cache[namespace] || {}
	return cache[namespace];
}

const set = (namespace, key, val) => getNamespace(namespace)[key] = val;


const get = (namespace, key, val) => getNamespace(namespace)[key];

module.exports = {
	getNamespace,
	set,
	get
}

/*
	normalizePropertyKey - takes a string and returns a normalized, lowercased
	string with no spaces so they can be matched against one another in styles
*/
module.exports = function normalizePropertyKey(key = '') {
	return key
		.normalize()
		.toLowerCase()
		.replace(/\s+/g, '');
};

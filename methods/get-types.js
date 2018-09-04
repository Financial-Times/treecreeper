const getType = require('./get-type');
const rawData = require('../lib/raw-data');

module.exports.method = (options = {}) =>
	rawData.getTypes().map(({ name }) => getType.method(name, options));

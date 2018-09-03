const getType = require('./get-type').method;
const rawData = require('../lib/raw-data');

module.exports.method = (options = {}) =>
	rawData.getTypes().map(({ name }) => getType(name, options));

const getType = require('./get-type');
const rawData = require('../lib/raw-data');

module.exports = (options = {}) =>
	rawData.getTypes().map(({ name }) => getType(name, options));

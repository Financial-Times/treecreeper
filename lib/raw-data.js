const { clear: clearCache } = require('./cache');
const readYaml = require('./read-yaml');

let cachedData = {
	types: readYaml.directory('types'),
	stringPatterns: readYaml.file('string-patterns.yaml'),
	enums: readYaml.file('enums.yaml'),
	version: process.env.CIRCLECI_SHA1,
};

module.exports = {
	getTypes: () => cachedData.types,
	getStringPatterns: () => cachedData.stringPatterns,
	getEnums: () => cachedData.enums,
	getVersion: () => cachedData.version,
	getAll: () => cachedData,
	set: data => {
		cachedData = data;
		clearCache();
	},
};

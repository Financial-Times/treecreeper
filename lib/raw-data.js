const { clear: clearCache } = require('./cache');
const readYaml = require('./read-yaml');

let cachedData = {
	schema: {
		types: readYaml.directory('types'),
		stringPatterns: readYaml.file('string-patterns.yaml'),
		enums: readYaml.file('enums.yaml'),
	},
};

module.exports = {
	getTypes: () => cachedData.schema.types,
	getStringPatterns: () => cachedData.schema.stringPatterns,
	getEnums: () => cachedData.schema.enums,
	getVersion: () => cachedData.version,
	getAll: () => cachedData,
	set: data => {
		cachedData = data;
		clearCache();
	},
};

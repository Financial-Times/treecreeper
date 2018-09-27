const readYaml = require('./read-yaml');

const rawData = {
	types: readYaml.directory('types'),
	stringPatterns: readYaml.file('string-patterns.yaml'),
	enums: readYaml.file('enums.yaml')
};

module.exports = {
	getTypes: () => rawData.types,
	getStringPatterns: () => rawData.stringPatterns,
	getEnums: () => rawData.enums
};

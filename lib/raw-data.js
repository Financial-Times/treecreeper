const readYaml = require('./read-yaml');

const rawData = {
	types: readYaml.directory('types'),
	relationships: readYaml.file('relationships.yaml'),
	stringPatterns: readYaml.file('string-patterns.yaml'),
	enums: readYaml.file('enums.yaml')
};

module.exports = {
	getTypes: () => rawData.types,
	getRelationships: () => rawData.relationships,
	getStringPatterns: () => rawData.stringPatterns,
	getEnums: () => rawData.enums
};

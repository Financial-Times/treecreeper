const readYaml = require('./read-yaml');

const rawData = {
	types: readYaml.directory('types'),
	relationships: readYaml.file('rules/relationships.yaml'),
	stringPatterns: readYaml.file('rules/string-patterns.yaml'),
	enums: readYaml.file('rules/enums.yaml'),
}

module.exports = {
	getTypes: () => rawData.types,
	getRelationships: () => rawData.relationships,
	getStringPatterns: () => rawData.stringPatterns,
	getEnums: () => rawData.enums
}


const rawData = require('../lib/raw-data');
const cache = require('../lib/cache');
const getRelationships = require('./get-relationships');
const deepFreeze = require('deep-freeze');
const clone = require('clone');
const getStringPatterns = require('./get-string-patterns');

const getType = (
	typeName,
	{
		relationshipStructure = false, // flat, rest, graphql
		groupProperties = false
	} = {}
) => {
	let type = rawData.getTypes().find(type => type.name === typeName);
	if (!type) {
		return;
	}
	type = clone(type);

	if (!('properties' in type)) {
		type.properties = {};
	}
	if (!type.pluralName) {
		type.pluralName = `${type.name}s`;
	}

	Object.values(type.properties).forEach(prop => {
		if (prop.pattern) {
			prop.pattern = getStringPatterns.method(prop.pattern);
		}
	});

	if (relationshipStructure) {
		const relationships = getRelationships.method(type.name, {
			structure: relationshipStructure
		});
		if (relationshipStructure === 'graphql') {
			relationships.forEach(def => {
				type.properties[def.name] = def;
			});
		} else {
			type.relationships = relationships;
		}
	}
	return deepFreeze(type);
};

module.exports.method = cache.cacheify(
	getType,
	(typeName, { relationshipStructure = false, groupProperties = false } = {}) =>
		`types:${typeName}:${relationshipStructure}:${groupProperties}`
);

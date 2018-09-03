const rawData = require('../lib/raw-data');
const cache = require('../lib/cache');
const getRelationships = require('./get-relationships');
const dummyRegExp = { test: () => true };
const deepFreeze = require('deep-freeze');
const clone = require('clone');

const getValidator = cache.cacheify(
	patternName => {
		if (!patternName) {
			return dummyRegExp;
		}

		let patternDef = rawData.getStringPatterns()[patternName];
		if (!patternDef) {
			cache.set('stringPatterns', patternName, dummyRegExp);
			return dummyRegExp;
		}
		if (typeof patternDef === 'string') {
			patternDef = { pattern: patternDef };
		}
		return new RegExp(patternDef.pattern, patternDef.flags);
	},
	patternName => `stringPatterns:${patternName}`
);

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

	if (!type.pluralName) {
		type.pluralName = `${type.name}s`;
	}

	Object.values(type.properties).forEach(prop => {
		prop.pattern = getValidator(prop.pattern);
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

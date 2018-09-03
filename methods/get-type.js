const rawData = require('../lib/raw-data');
const cache = require('../lib/cache');
const getRelationships = require('./get-relationships');
const dummyRegExp = { test: () => true };
const deepFreeze = require('deep-freeze');
const clone = require('clone');

const getValidator = patternName => {
	if (!patternName) {
		return dummyRegExp;
	}

	let validator = cache.get('stringPatterns', patternName);
	if (!validator) {
		let patternDef = rawData.getStringPatterns()[patternName];
		if (!patternDef) {
			cache.set('stringPatterns', patternName, dummyRegExp);
			return dummyRegExp;
		}
		if (typeof patternDef === 'string') {
			patternDef = { pattern: patternDef };
		}
		const regEx = new RegExp(patternDef.pattern, patternDef.flags);
		validator = regEx;

		cache.set('stringPatterns', patternName, validator);
	}

	return validator;
};

module.exports.method = (
	typeName,
	{
		relationshipStructure = false, // flat, rest, graphql
		groupProperties = false
	} = {}
) => {
	const cacheKey = `${typeName}:${relationshipStructure}:${groupProperties}`;
	let type = cache.get('types', cacheKey);
	if (typeof type === 'undefined') {
		type = rawData.getTypes().find(type => type.name === typeName);
		if (!type) {
			cache.set('types', cacheKey, null);
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
		type = deepFreeze(type);
		cache.set('types', cacheKey, type);
	}

	return type;
};

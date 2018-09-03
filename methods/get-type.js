const rawData = require('../lib/raw-data')
const cache = require('../lib/cache')
const getRelationships = require('./get-relationships');
const dummyRegExp = {test: () => true};

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
		validator = regEx
		cache.set('stringPatterns', patternName, validator);
	}

	return validator;
}


module.exports.method = (typeName, {
	relationshipsStructure = false, // flat, structured
	groupProperties = false
} = {}) => {
	const cacheKey = `${typeName}:${relationshipsStructure}:${groupProperties}`
	let type = cache.get('types', cacheKey);
	if (!type) {
		type = rawData.getTypes().find(type => type.name == typeName);
		if (!type) {
			cache.set('types', cacheKey, null);
			return;
		}
		if (!type.pluralName) {
			type.pluralName = `${type.name}s`
		};

		if (type.properties) {
			Object.values(type.properties).forEach(prop => {
				prop.pattern = getValidator(prop.pattern);
			})
		}
		cache.set('types', cacheKey, type);

		if (relationshipsStructure) {
			type.relationships = getRelationships.method(type.name, {structure: relationshipsStructure})
		}
	}
	return type;
}

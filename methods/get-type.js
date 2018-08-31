const rawData = require('../lib/raw-data')
const cache = require('../lib/cache')


const dummyRegExp = {test: () => true};

const getValidator = patternName => {
	if (!patternName) {
		return dummyRegExp;
	}
	let validator = cache.get('stringPatterns', patternName);

	if (!validator) {
		let patternDef = rawData.getStringPatterns()[patternName];
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
	withGraphQLRelationships = false,
	withNeo4jRelationships = false,
	groupProperties = false
} = {}) => {
	const cacheKey = `${typeName}:${withGraphQLRelationships}:${withNeo4jRelationships}:${groupProperties}`
	let type = cache.get('types', cacheKey);
	if (!type) {
		console.log(typeName, cacheKey)
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
	}
	return type;
}

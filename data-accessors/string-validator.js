const dummyRegExp = { test: () => true };

// TODO just have a string validators method, similar to getEnums
// that makes them all available
module.exports = rawData =>
	rawData.cache.cacheify(
		patternName => {
			if (!patternName) {
				return dummyRegExp;
			}
			let patternDef = rawData.getStringPatterns()[patternName];
			if (!patternDef) {
				return dummyRegExp;
			}
			if (typeof patternDef === 'string') {
				patternDef = { pattern: patternDef };
			}
			return new RegExp(patternDef.pattern, patternDef.flags);
		},
		patternName => `stringPatterns:${patternName}`,
	);

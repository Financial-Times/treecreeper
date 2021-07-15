const dummyRegExp = { test: () => true };

module.exports = {
	cacheKeyGenerator: patternName => `stringPatterns:${patternName}`,
	accessor(patternName) {
		if (!patternName) {
			return dummyRegExp;
		}
		let patternDef = this.rawData.getStringPatterns()[patternName];
		if (!patternDef) {
			return dummyRegExp;
		}
		if (typeof patternDef === 'string') {
			patternDef = { pattern: patternDef };
		}
		return new RegExp(patternDef.pattern, patternDef.flags);
	},
};

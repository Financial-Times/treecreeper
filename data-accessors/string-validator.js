const dummyRegExp = { test: () => true };

module.exports = {
	cacheKeyHelper: patternName => `stringPatterns:${patternName}`,
	accessor: (rawData, patternName) => {
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
};

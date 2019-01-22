const rawData = require('../lib/raw-data');
const cache = require('../lib/cache');

const dummyRegExp = { test: () => true };

module.exports = cache.cacheify(
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
	patternName => `stringPatterns:${patternName}`,
);

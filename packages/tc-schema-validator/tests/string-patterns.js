/* global it, describe, expect */
const { SDK } = require('@financial-times/tc-schema-sdk');

const sdk = new SDK();
sdk.init();
const stringPatterns = sdk.rawData.getStringPatterns();

describe('string patterns', () => {
	Object.entries(stringPatterns).forEach(([name, pattern]) => {
		if (typeof pattern === 'string') {
			it(`${name} evaluates to valid flagless regex`, () => {
				expect(() => new RegExp(pattern)).not.toThrow();
			});
		} else {
			it(`${name} evaluates to valid flagged regex`, () => {
				expect(
					() => new RegExp(pattern.pattern, pattern.flags),
				).not.toThrow();
			});
		}
	});
});

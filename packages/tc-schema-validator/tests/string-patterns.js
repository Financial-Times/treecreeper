/* global it, describe, expect */
const { SDK } = require('@financial-times/tc-schema-sdk');

const sdk = new SDK();
sdk.init();
const stringPatterns = sdk.rawData.getStringPatterns();
const longString = 'x'.repeat(257);

describe('string patterns', () => {
	Object.entries(stringPatterns).forEach(([name, pattern]) => {
		if (typeof pattern === 'string') {
			it(`${name} evaluates to valid flagless regex`, () => {
				expect(() => new RegExp(pattern)).not.toThrow();
			});
			it(`${name} blocks very long strings`, () => {
				const regex = new RegExp(pattern);
				expect(regex.test(longString)).toEqual(false);
			});
			it(`${name} matches the start and the end of strings`, () => {
				expect(pattern.startsWith('^')).toEqual(true);
				expect(pattern.endsWith('$')).toEqual(true);
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

/* global it, describe, expect */
const { SDK } = require('@financial-times/tc-schema-sdk');
const readYaml = require('@financial-times/tc-schema-sdk/lib/read-yaml');

const enums = new SDK({ readYaml }).rawData.getEnums();

describe('enums', () => {
	Object.entries(enums).forEach(([name, { description, options }]) => {
		describe(`${name}`, () => {
			it('has a description', () => {
				expect(typeof description).toBe('string');
				expect(description.length).toBeGreaterThanOrEqual(1);
			});
			it('has an array or object of options', () => {
				expect(
					Array.isArray(options) || typeof options === 'object',
				).toBe(true);
			});
			if (Array.isArray(options)) {
				options.forEach(option => {
					it(`element: ${option} is a string`, () => {
						expect(typeof option).toBe('string');
					});
					it(`element: ${option} does not begin with a number`, () => {
						expect(option).not.toMatch(/^\d/);
					});
				});
			} else {
				it('has only string keys', () => {
					Object.keys(options).forEach(opt =>
						expect(typeof opt).toBe('string'),
					);
				});
				it('has only string values', () => {
					Object.values(options).forEach(opt =>
						expect(typeof opt).toBe('string'),
					);
				});
				it('has no numbers in keys', () => {
					Object.keys(options).forEach(opt =>
						expect(opt).not.toMatch(/\d/),
					);
				});
			}
		});
	});
});

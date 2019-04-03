const RawData = require('../../lib/raw-data');

const enums = new RawData().getEnums();

describe('data quality: enum spec', () => {
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
					if (option.value) {
						it(`${option} is an object`, () => {
							expect(typeof option).toBe('object');
						});
						it(`${option} has a property called value`, () => {
							expect(option).toHaveProperty('value');
						});
						it(`${option} has a property called description`, () => {
							expect(option).toHaveProperty('description');
						});
						it(`key: ${
							option.value
						} does not begin with a number`, () => {
							expect(option.value).not.toMatch(/^\d/);
						});
					} else {
						it(`key: ${option} is a string`, () => {
							expect(typeof option).toBe('string');
						});
						it(`key: ${option} does not begin with a number`, () => {
							expect(option).not.toMatch(/^\d/);
						});
					}
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

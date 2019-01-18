const rawData = require('../../lib/raw-data');

const enums = rawData.getEnums();

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
				it('has only string keys ', () => {
					options.forEach(opt => expect(typeof opt).toBe('string'));
				});
				it('has no keys beginning with numbers', () => {
					options.forEach(opt => expect(opt).not.toMatch(/^\d/));
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

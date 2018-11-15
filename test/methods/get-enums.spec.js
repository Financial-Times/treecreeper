const { getEnums } = require('../../');
const rawData = require('../../lib/raw-data');
const cache = require('../../lib/cache');

describe('get-enums', () => {
	beforeEach(() => {
		jest.spyOn(rawData, 'getEnums');
	});

	afterEach(() => {
		cache.clear();
		jest.restoreAllMocks();
	});

	it('retrieve enums', () => {
		rawData.getEnums.mockReturnValue({
			enum1: {
				description: 'ab',
				options: ['a']
			}
		});
		expect(getEnums()).toEqual({ enum1: { a: 'a' } });
	});

	it('retrieve enums with metadata', () => {
		rawData.getEnums.mockReturnValue({
			enum1: {
				description: 'ab',
				options: ['a']
			}
		});
		expect(getEnums({ withMeta: true })).toEqual({
			enum1: { description: 'ab', options: { a: 'a' } }
		});
	});

	it('convert arrays into key/value maps', () => {
		rawData.getEnums.mockReturnValue({
			enum1: {
				options: ['a', 'b', 'c']
			}
		});
		expect(getEnums()).toEqual({ enum1: { a: 'a', b: 'b', c: 'c' } });
	});

	it('retrieve key/value maps unaltered', () => {
		rawData.getEnums.mockReturnValue({
			enum1: {
				options: {
					a: 1,
					b: 2,
					c: 3
				}
			}
		});
		expect(getEnums()).toEqual({ enum1: { a: 1, b: 2, c: 3 } });
	});
});

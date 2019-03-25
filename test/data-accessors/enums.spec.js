const { init } = require('../..');

const enumsFromRawData = data =>
	init({ rawData: { schema: { enums: data } } }).getEnums;

describe('get-enums', () => {
	it('retrieve enums', () => {
		const getEnums = enumsFromRawData({
			enum1: {
				description: 'ab',
				options: ['a'],
			},
		});
		expect(getEnums()).toEqual({ enum1: { a: 'a' } });
	});

	it('retrieve enums with metadata', () => {
		const getEnums = enumsFromRawData({
			enum1: {
				description: 'ab',
				options: ['a'],
			},
		});
		expect(getEnums({ withMeta: true })).toEqual({
			enum1: { description: 'ab', options: { a: 'a' } },
		});
	});

	it('convert arrays into key/value maps', () => {
		const getEnums = enumsFromRawData({
			enum1: {
				options: ['a', 'b', 'c'],
			},
		});
		expect(getEnums()).toEqual({ enum1: { a: 'a', b: 'b', c: 'c' } });
	});

	it('retrieve key/value maps unaltered', () => {
		const getEnums = enumsFromRawData({
			enum1: {
				options: {
					a: 1,
					b: 2,
					c: 3,
				},
			},
		});
		expect(getEnums()).toEqual({ enum1: { a: 1, b: 2, c: 3 } });
	});
});

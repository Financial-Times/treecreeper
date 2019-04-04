const { init } = require('../../lib/get-instance');

const enumsFromRawData = data =>
	init({ rawData: { schema: { enums: data } } }).getEnums;

describe('get-enums', () => {
	describe('with value and description', () => {
		it('retrieve enums', () => {
			const getEnums = enumsFromRawData({
				enum1: {
					description: 'ab',
					options: [{ value: 'a', description: 'description' }],
				},
			});
			expect(getEnums()).toEqual({ enum1: { a: 'description' } });
		});

		it('retrieve enums with metadata', () => {
			const getEnums = enumsFromRawData({
				enum1: {
					description: 'ab',
					options: [{ value: 'a', description: 'description' }],
				},
			});
			expect(getEnums({ withMeta: true })).toEqual({
				enum1: { description: 'ab', options: { a: 'description' } },
			});
		});

		it('convert arrays into key/value maps', () => {
			const getEnums = enumsFromRawData({
				enum1: {
					options: [
						{ value: 'a', description: 'description' },
						{ value: 'b', description: 'description' },
						{ value: 'c', description: 'description' },
					],
				},
			});
			expect(getEnums()).toEqual({
				enum1: {
					a: 'description',
					b: 'description',
					c: 'description',
				},
			});
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

	describe('with array of options (no descriptions)', () => {
		it('retrieve enums', () => {
			const getEnums = enumsFromRawData({
				enum1: {
					description: 'ab',
					options: ['a'],
				},
			});
			expect(getEnums()).toEqual({ enum1: { a: null } });
		});

		it('retrieve enums with metadata', () => {
			const getEnums = enumsFromRawData({
				enum1: {
					description: 'ab',
					options: ['a'],
				},
			});
			expect(getEnums({ withMeta: true })).toEqual({
				enum1: { description: 'ab', options: { a: null } },
			});
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
});

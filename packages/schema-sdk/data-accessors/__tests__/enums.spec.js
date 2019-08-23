const { SDK } = require('../../sdk');

const enumsFromRawData = data => {
	const sdk = new SDK()
	sdk.init({ schemaData: { schema: { enums: data } } })
	return sdk.getEnums;
}

describe('get-enums', () => {
	describe('from array', () => {
		let getEnums;

		beforeEach(() => {
			getEnums = enumsFromRawData({
				enum1: {
					description: 'ab',
					options: ['a', 'b'],
				},
			});
		});

		describe('withMeta: false', () => {
			it('retrieve enums', () => {
				expect(getEnums()).toEqual({
					enum1: {
						a: 'a',
						b: 'b',
					},
				});
			});
		});

		describe('withMeta: true', () => {
			it('retrieve enums', () => {
				expect(getEnums({ withMeta: true })).toEqual({
					enum1: {
						description: 'ab',
						options: {
							a: { value: 'a' },
							b: { value: 'b' },
						},
					},
				});
			});
		});
	});

	describe('from object', () => {
		let getEnums;

		beforeEach(() => {
			getEnums = enumsFromRawData({
				enum1: {
					description: 'abc',
					options: {
						a: 1,
						b: 2,
						c: 3,
					},
				},
			});
		});

		describe('withMeta: false', () => {
			it('retrieve enums - unchanged', () => {
				expect(getEnums()).toEqual({
					enum1: { a: 'a', b: 'b', c: 'c' },
				});
			});
		});

		describe('withMeta: true - with description', () => {
			it('retrieve enums', () => {
				expect(getEnums({ withMeta: true })).toEqual({
					enum1: {
						description: 'abc',
						options: {
							a: { value: 'a', description: 1 },
							b: { value: 'b', description: 2 },
							c: { value: 'c', description: 3 },
						},
					},
				});
			});
		});
	});
});

const typeAccessor = jest.fn();
typeAccessor.mockImplementation((rawData, getStringValidator, name) => ({
	name: `${name} - retrieved`,
}));

jest.doMock('../../data-accessors/type', () => {
	return {
		accessor: typeAccessor,
		cacheKeyGenerator: name => name,
	};
});
const { init } = require('../../lib/get-instance');

describe('get-types', () => {
	it('gets all types', () => {
		const types = init({
			rawData: {
				schema: {
					types: [
						{
							name: 'Type1',
						},
						{ name: 'Type2' },
					],
				},
			},
		}).getTypes({ option: 'value' });

		expect(types).toEqual([
			{
				name: 'Type1 - retrieved',
			},
			{
				name: 'Type2 - retrieved',
			},
		]);

		expect(typeAccessor).toHaveBeenCalledWith(
			expect.any(Object),
			expect.any(Function),
			'Type1',
			{
				option: 'value',
			},
		);
		expect(typeAccessor).toHaveBeenCalledWith(
			expect.any(Object),
			expect.any(Function),
			'Type2',
			{
				option: 'value',
			},
		);
	});

	it('expects to be returned in order of type hiererchy', () => {
		throw 'No'
	})
});

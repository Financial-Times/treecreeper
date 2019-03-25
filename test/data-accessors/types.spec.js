const typeAccessor = jest.fn();
typeAccessor.mockImplementation((rawData, name) => ({
	name: `${name} - retrieved`,
}));

jest.doMock('../../data-accessors/type', () => {
	return {
		accessor: typeAccessor,
		cacheKeyHelper: name => name,
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
							description: 'woo1',
						},
						{ name: 'Type2', description: 'woo2' },
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

		expect(typeAccessor).toHaveBeenCalledWith(expect.any(Object), 'Type1', {
			option: 'value',
		});
		expect(typeAccessor).toHaveBeenCalledWith(expect.any(Object), 'Type2', {
			option: 'value',
		});
	});
});

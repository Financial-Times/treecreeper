const typeAccessor = jest.fn();
typeAccessor.mockImplementation((rawData, name) => ({
	name: `${name} - retrieved`,
}));

const type = jest.doMock('../../data-accessors/type', () => {
	return {
		accessor: typeAccessor,
		cacheKeyHelper: name => name,
	};
});
const RawData = require('../../lib/raw-data');

const dataAccessors = require('../../data-accessors');

describe('get-types', () => {
	it('gets all types', () => {
		const rawData = new RawData();
		rawData.setRawData({
			schema: {
				types: [
					{
						name: 'Type1',
						description: 'woo1',
					},
					{ name: 'Type2', description: 'woo2' },
				],
			},
		});
		const accessors = dataAccessors(rawData);
		const types = accessors.getTypes({ option: 'value' });

		expect(types).toEqual([
			{
				name: 'Type1 - retrieved',
			},
			{
				name: 'Type2 - retrieved',
			},
		]);

		expect(typeAccessor).toHaveBeenCalledWith(rawData, 'Type1', {
			option: 'value',
		});
		expect(typeAccessor).toHaveBeenCalledWith(rawData, 'Type2', {
			option: 'value',
		});
	});
});

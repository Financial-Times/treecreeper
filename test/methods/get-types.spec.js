const { getTypes } = require('../../');
const getType = require('../../methods/get-type');
const rawData = require('../../lib/raw-data');
const cache = require('../../lib/cache');

describe('get-types', () => {
	beforeEach(() => {
		jest.spyOn(rawData, 'getTypes').mockImplementation(() => ([
			{
				name: 'Type1'
			},
			{ name: 'Type2' }
		]));
		jest.spyOn(getType, 'method').mockImplementation(type => ({ name: type, description: 'woo' }));
	});
	afterEach(() => {
		jest.restoreAllMocks()
		cache.clear();
	});
	it('gets all types', () => {
		expect(getTypes({ option: 'value' })).toEqual([
			{
				name: 'Type1',
				description: 'woo'
			},
			{
				name: 'Type2',
				description: 'woo'
			}
		]);
		expect(getType.method).toHaveBeenCalledWith('Type1', { option: 'value' });
		expect(getType.method).toHaveBeenCalledWith('Type2', { option: 'value' });
	});
});

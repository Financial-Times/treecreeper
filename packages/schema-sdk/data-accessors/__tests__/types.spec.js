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
const { accessors } = require('..');

describe('get-types', () => {
	it('gets all types (hierarchyless)', () => {
		const types = accessors({
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

	describe('with hierarchy', () => {
		it('expects to be returned in order of type hiererchy', () => {
			const types = accessors({
				rawData: {
					schema: {
						types: [
							{
								name: 'Type1',
							},
							{ name: 'Type2' },
						],
						typeHierarchy: {
							category1: {
								types: ['Type2'],
							},
							category2: {
								types: ['Type1'],
							},
						},
					},
				},
			}).getTypes();

			expect(types).toEqual([
				{
					name: 'Type2 - retrieved',
				},
				{
					name: 'Type1 - retrieved',
				},
			]);
		});

		it('gets all types grouped by category', () => {
			const types = accessors({
				rawData: {
					schema: {
						types: [
							{
								name: 'Type1',
							},
							{ name: 'Type2' },
						],
						typeHierarchy: {
							category1: {
								types: ['Type2'],
							},
							category2: {
								types: ['Type1'],
							},
						},
					},
				},
			}).getTypes({ grouped: true });

			expect(types).toEqual({
				category1: {
					types: [
						{
							name: 'Type2 - retrieved',
						},
					],
				},
				category2: {
					types: [
						{
							name: 'Type1 - retrieved',
						},
					],
				},
			});
		});
	});
});

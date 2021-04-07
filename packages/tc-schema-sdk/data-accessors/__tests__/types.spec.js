const typeAccessor = jest.fn();
typeAccessor.mockImplementation(name => ({
	name: `${name}`,
	retrieved: true,
}));

jest.doMock('../../data-accessors/type', () => {
	return {
		accessor: typeAccessor,
		cacheKeyGenerator: name => name,
	};
});
const { SDK } = require('../../sdk');

describe('get-types', () => {
	it('gets all types (hierarchyless)', () => {
		const types = new SDK({
			schemaData: {
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
				name: 'Type1',
				retrieved: true,
			},
			{
				name: 'Type2',
				retrieved: true,
			},
		]);

		expect(typeAccessor).toHaveBeenCalledWith('Type1', {
			option: 'value',
		});
		expect(typeAccessor).toHaveBeenCalledWith('Type2', {
			option: 'value',
		});
	});

	describe('with hierarchy', () => {
		it('expects to be returned in order of type hierarchy', () => {
			const types = new SDK({
				schemaData: {
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
					name: 'Type2',
					retrieved: true,
				},
				{
					name: 'Type1',
					retrieved: true,
				},
			]);
		});

		it('gets all types grouped by category', () => {
			const types = new SDK({
				schemaData: {
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
							name: 'Type2',
							retrieved: true,
						},
					],
				},
				category2: {
					types: [
						{
							name: 'Type1',
							retrieved: true,
						},
					],
				},
			});
		});
	});
});

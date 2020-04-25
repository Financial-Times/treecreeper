const { setupMocks } = require('../../../test-helpers');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');
const { headHandler } = require('../head');

describe('rest HEAD', () => {
	const namespace = 'api-rest-handlers-head';
	const mainCode = `${namespace}-main`;
	const input = {
		type: 'MainType',
		code: mainCode,
	};

	const { createNodes, createNode } = setupMocks(namespace);

	const createMainNode = (props = {}) =>
		createNode('MainType', { code: mainCode, ...props });

	it('gets record', async () => {
		await createMainNode({
			someString: 'name1',
		});
		const { status } = await headHandler()(input);

		expect(status).toBe(200);
	});

	describe('using alternative id', () => {
		it('gets by alternative id field', async () => {
			await createMainNode({
				someString: 'example-value-head',
			});
			const { status } = await headHandler()({
				type: 'MainType',
				code: 'example-value-head',
				query: {
					idField: 'someString',
				},
			});

			expect(status).toBe(200);
		});

		it('throws 404 error if no record with alternative id', async () => {
			await expect(
				headHandler()({
					type: 'MainType',
					code: 'example-value-head',
					query: {
						idField: 'someString',
					},
				}),
			).rejects.httpError({
				status: 404,
				message: `MainType with someString "example-value-head" does not exist`,
			});
		});

		it('throws 409 error if multiple records with alternative id exist', async () => {
			await createNodes(
				[
					'MainType',
					{ code: `${mainCode}-1`, someString: 'example-value-head' },
				],
				[
					'MainType',
					{ code: `${mainCode}-2`, someString: 'example-value-head' },
				],
			);
			await expect(
				headHandler()({
					type: 'MainType',
					code: 'example-value-head',
					query: {
						idField: 'someString',
					},
				}),
			).rejects.httpError({
				status: 409,
				message: `Multiple MainType records with someString "example-value-head" exist`,
			});
		});
	});

	it('throws 404 error if no record', async () => {
		await expect(headHandler()(input)).rejects.httpError({
			status: 404,
			message: `MainType with code "${mainCode}" does not exist`,
		});
	});

	it('throws if neo4j query fails', async () => {
		dbUnavailable();
		await expect(headHandler()(input)).rejects.toThrow('oh no');
	});
});

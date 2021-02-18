const { setupMocks } = require('../../../test-helpers');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');
const { getHandler } = require('../get');

describe('rest GET', () => {
	const namespace = 'api-rest-handlers-get';
	const mainCode = `${namespace}-main`;
	const input = {
		type: 'SimpleGraphBranch',
		code: mainCode,
	};

	const { createNodes, createNode, connectNodes, meta } = setupMocks(
		namespace,
	);

	it('gets record without relationships', async () => {
		await createNode('SimpleGraphBranch', {
			code: mainCode,
			stringProperty: 'name1',
		});
		const { body, status } = await getHandler()(input);

		expect(status).toBe(200);
		expect(body).toMatchObject({ code: mainCode, stringProperty: 'name1' });
	});

	it('retrieves metadata', async () => {
		await createNode('SimpleGraphBranch', { code: mainCode });
		const { body, status } = await getHandler()(input);

		expect(status).toBe(200);
		expect(body).toMatchObject(meta.default);
	});

	it('retrieves array data', async () => {
		await createNode('SimpleGraphBranch', {
			code: mainCode,
			// someStringList: ['one', 'two'],
			someMultipleChoice: ['First', 'Second'],
		});
		const { body, status } = await getHandler()(input);

		expect(status).toBe(200);
		expect(body).toMatchObject({
			// someStringList: ['one', 'two'],
			someMultipleChoice: ['First', 'Second'],
		});
	});

	it('gets record with relationships', async () => {
		const [main, leaf, parent] = await createNodes(
			['SimpleGraphBranch', mainCode],
			['SimpleGraphLeaf', `${namespace}-leaf`],
			['SimpleGraphBranch', `${namespace}-parent`],
		);
		await connectNodes(
			// tests incoming and outgoing relationships
			[main, 'HAS_LEAF', leaf],
			[parent, 'HAS_CHILD', main],
		);

		const { body, status } = await getHandler()(input);
		expect(status).toBe(200);
		expect(body).toMatchObject({
			code: mainCode,
			parent: `${namespace}-parent`,
			leaves: [`${namespace}-leaf`],
		});
	});

	it('throws 404 error if no record', async () => {
		await expect(getHandler()(input)).rejects.httpError({
			status: 404,
			message: `SimpleGraphBranch ${mainCode} does not exist`,
		});
	});

	it('throws if neo4j query fails', async () => {
		dbUnavailable();
		await expect(getHandler()(input)).rejects.toThrow('oh no');
	});

	describe('rich relationship information', () => {
		it('gets record with rich relationship information if richRelationships query is true', async () => {
			const [main, childOne, childTwo, parent] = await createNodes(
				['SimpleGraphBranch', mainCode],
				['SimpleGraphLeaf', `${namespace}-leaf-1`],
				['SimpleGraphLeaf', `${namespace}-leaf-2`],
				['SimpleGraphBranch', `${namespace}-parent`],
			);
			await connectNodes(
				[main, 'HAS_LEAF', childOne],
				[main, 'HAS_LEAF', childTwo],
				[parent, 'HAS_CHILD', main],
			);

			const { body, status } = await getHandler()({
				query: { richRelationships: true },
				...input,
			});

			expect(status).toBe(200);
			[...body.leaves, body.parent].forEach(relationship =>
				expect(relationship).toHaveProperty(
					'code',
					'_updatedByClient',
					'_updatedByRequest',
					'_updatedTimestamp',
					'_updatedByUser',
					'_createdByClient',
					'_createdByRequest',
					'_createdTimestamp',
					'_createdByUser',
				),
			);
		});
	});
});

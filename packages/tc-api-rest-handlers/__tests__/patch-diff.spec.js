const { setupMocks } = require('../../../test-helpers');
const { spyDbQuery } = require('../../../test-helpers/db-spies');

const { patchHandler } = require('../patch');

describe('rest PATCH diff', () => {
	const namespace = 'api-rest-handlers-patch-diff';
	const mainCode = `${namespace}-main`;
	const childCode = `${namespace}-child`;
	const parentCode = `${namespace}-parent`;

	const { createNodes, createNode, connectNodes } = setupMocks(namespace);

	const getInput = (body, query, metadata) => ({
		type: 'MainType',
		code: mainCode,
		body,
		query,
		metadata,
	});

	const basicHandler = (...args) => patchHandler()(getInput(...args));

	const createMainNode = (props = {}) =>
		createNode('MainType', { code: mainCode, ...props });

	it("doesn't write if no real property changes detected", async () => {
		await createMainNode({
			someString: 'some string',
		});
		const dbQuerySpy = spyDbQuery();
		const { status } = await basicHandler({
			someString: 'some string',
		});
		expect(status).toBe(200);
		expect(dbQuerySpy).not.toHaveBeenCalledWith(
			expect.stringMatching(/MERGE|CREATE/),
			expect.any(Object),
		);
	});

	it("doesn't write if no real array property changes detected", async () => {
		await createMainNode({
			// someStringList: ['one', 'two'],
			someMultipleChoice: ['First', 'Second'],
		});
		const dbQuerySpy = spyDbQuery();
		const { status } = await basicHandler({
			// someStringList: ['two', 'one'],
			someMultipleChoice: ['Second', 'First'],
		});
		expect(status).toBe(200);
		expect(dbQuerySpy).not.toHaveBeenCalledWith(
			expect.stringMatching(/MERGE|CREATE/),
			expect.any(Object),
		);
	});

	it("doesn't write if no real relationship changes detected in REPLACE mode", async () => {
		const [main, child] = await createNodes(
			['MainType', mainCode],
			['ChildType', childCode],
		);
		await connectNodes(main, 'HAS_CHILD', child);
		const dbQuerySpy = spyDbQuery();
		const { status } = await basicHandler(
			{ children: [childCode] },
			{ relationshipAction: 'replace' },
		);
		expect(status).toBe(200);
		expect(dbQuerySpy).not.toHaveBeenCalledWith(
			expect.stringMatching(/MERGE|CREATE/),
			expect.any(Object),
		);
	});

	it("doesn't write if no real relationship changes detected in MERGE mode", async () => {
		const [main, child] = await createNodes(
			['MainType', mainCode],
			['ChildType', childCode],
		);
		await connectNodes(main, 'HAS_CHILD', child);
		const dbQuerySpy = spyDbQuery();

		const { status } = await basicHandler(
			{ children: [childCode] },
			{ relationshipAction: 'merge' },
		);
		expect(status).toBe(200);
		expect(dbQuerySpy).not.toHaveBeenCalledWith(
			expect.stringMatching(/MERGE|CREATE/),
			expect.any(Object),
		);
	});

	it('writes if property but no relationship changes detected', async () => {
		const [main, child] = await createNodes(
			['MainType', mainCode],
			['ChildType', childCode],
		);
		await connectNodes(main, 'HAS_CHILD', child);
		const dbQuerySpy = spyDbQuery();
		const { status } = await basicHandler(
			{ someString: 'new-name', children: [childCode] },
			{ relationshipAction: 'merge' },
		);
		expect(status).toBe(200);
		expect(dbQuerySpy).toHaveBeenCalledWith(
			expect.stringMatching(/MERGE|CREATE/),
			expect.any(Object),
		);
	});

	it('writes if relationship but no property changes detected', async () => {
		const [main, child] = await createNodes(
			['MainType', { code: mainCode, someString: 'someString' }],
			['ChildType', `${childCode}-1`],
			['ChildType', `${childCode}-2`],
		);
		await connectNodes(main, 'HAS_CHILD', child);
		const dbQuerySpy = spyDbQuery();
		const { status } = await basicHandler(
			{ someString: 'someString', children: [`${childCode}-2`] },
			{ relationshipAction: 'merge' },
		);
		expect(status).toBe(200);
		expect(dbQuerySpy).toHaveBeenCalledWith(
			expect.stringMatching(/MERGE|CREATE/),
			expect.any(Object),
		);
	});

	it("doesn't write if no real relationship property changes detected", async () => {
		const [main, child] = await createNodes(
			['MainType', mainCode],
			['ChildType', childCode],
		);
		await connectNodes(main, 'HAS_CURIOUS_CHILD', child, {
			someString: 'some string',
		});
		const dbQuerySpy = spyDbQuery();
		const { status } = await basicHandler(
			{ curiousChild: [{ code: childCode, someString: 'some string' }] },
			{ relationshipAction: 'merge' },
		);
		expect(status).toBe(200);
		expect(dbQuerySpy).not.toHaveBeenCalledWith(
			expect.stringMatching(/MERGE|CREATE/),
			expect.any(Object),
		);
	});

	it("doesn't write if no real relationship property changes detected (mixed relationships with and without prop)", async () => {
		const [main, parent1, parent2] = await createNodes(
			['MainType', mainCode],
			['ParentType', `${parentCode}-1`],
			['ParentType', `${parentCode}-2`],
		);
		await connectNodes(
			[
				parent1,
				'IS_CURIOUS_PARENT_OF',
				main,
				{ someString: 'some string' },
			],
			[parent2, 'IS_CURIOUS_PARENT_OF', main],
		);
		const dbQuerySpy = spyDbQuery();
		const { status } = await basicHandler(
			{
				curiousParent: [
					{ code: `${parentCode}-1`, someString: 'some string' },
					`${parentCode}-2`,
				],
			},
			{ relationshipAction: 'merge' },
		);
		expect(status).toBe(200);
		expect(dbQuerySpy).not.toHaveBeenCalledWith(
			expect.stringMatching(/MERGE|CREATE/),
			expect.any(Object),
		);
	});

	it('writes if one of the relationship properties changes detected', async () => {
		const [main, child] = await createNodes(
			['MainType', mainCode],
			['ChildType', childCode],
		);
		await connectNodes(main, 'HAS_CURIOUS_CHILD', child, {
			someString: 'some string',
			anotherString: 'another string',
		});
		const dbQuerySpy = spyDbQuery();
		const { status } = await basicHandler(
			{
				curiousChild: [
					{
						code: childCode,
						someString: 'some string',
						anotherString: 'new another string',
					},
				],
			},
			{ relationshipAction: 'merge' },
		);
		expect(status).toBe(200);
		expect(dbQuerySpy).toHaveBeenCalledWith(
			expect.stringMatching(/MERGE|CREATE/),
			expect.any(Object),
		);
	});

	it('detects deleted relationship property as a change', async () => {
		const [main, child] = await createNodes(
			['MainType', mainCode],
			['ChildType', childCode],
		);
		await connectNodes(main, 'HAS_CURIOUS_CHILD', child, {
			someString: 'some string',
		});
		const dbQuerySpy = spyDbQuery();
		const { status } = await basicHandler(
			{ curiousChild: [{ code: childCode, someString: null }] },
			{ relationshipAction: 'merge' },
		);
		expect(status).toBe(200);
		expect(dbQuerySpy).toHaveBeenCalledWith(
			expect.stringMatching(/MERGE|CREATE/),
			expect.any(Object),
		);
	});

	it('detects deleted property as a change', async () => {
		await createNode('MainType', {
			code: mainCode,
			someString: 'someString',
		});
		const dbQuerySpy = spyDbQuery();
		const { status } = await basicHandler({ someString: null });
		expect(status).toBe(200);
		expect(dbQuerySpy).toHaveBeenCalledWith(
			expect.stringMatching(/MERGE|CREATE/),
			expect.any(Object),
		);
	});

	describe('patching with fewer relationships', () => {
		it('treats fewer relationships as a delete when replacing relationships', async () => {
			const [main, child1, child2] = await createNodes(
				['MainType', mainCode],
				['ChildType', `${childCode}-1`],
				['ChildType', `${childCode}-2`],
			);
			await connectNodes(
				[main, 'HAS_CHILD', child1],
				[main, 'HAS_CHILD', child2],
			);
			const dbQuerySpy = spyDbQuery();
			const { status } = await basicHandler(
				{ children: [`${childCode}-1`] },
				{ relationshipAction: 'replace' },
			);
			expect(status).toBe(200);
			expect(dbQuerySpy).toHaveBeenCalledWith(
				expect.stringMatching(/MERGE|CREATE/),
				expect.any(Object),
			);
		});

		it('treats fewer relationships as no change when merging relationships', async () => {
			const [main, child1, child2] = await createNodes(
				['MainType', mainCode],
				['ChildType', `${childCode}-1`],
				['ChildType', `${childCode}-2`],
			);
			await connectNodes(
				[main, 'HAS_CHILD', child1],
				[main, 'HAS_CHILD', child2],
			);
			const dbQuerySpy = spyDbQuery();
			const { status } = await basicHandler(
				{ children: [`${childCode}-1`] },
				{ relationshipAction: 'merge' },
			);
			expect(status).toBe(200);
			expect(dbQuerySpy).not.toHaveBeenCalledWith(
				expect.stringMatching(/MERGE|CREATE/),
				expect.any(Object),
			);
		});
	});
});

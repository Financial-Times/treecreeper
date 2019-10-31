const { patchHandler } = require('../patch');

const { setupMocks } = require('../../../test-helpers');

const { spyDbQuery } = require('../../../test-helpers/db-spies');

describe('rest PATCH diff', () => {
	const namespace = 'api-rest-handlers-patch-diff';
	const mainCode = `${namespace}-main`;
	const childCode = `${namespace}-child`;
	const clientId = `${namespace}-client`;

	const { createNodes, createNode, connectNodes } = setupMocks(namespace);

	const getInput = (body, query, metadata) => ({
		type: 'MainType',
		code: mainCode,
		body,
		query,
		metadata,
	});

	const lock = (client, ...fields) =>
		JSON.stringify(
			fields.reduce((obj, field) => ({ ...obj, [field]: client }), {}),
		);

	const basicHandler = (...args) => patchHandler()(getInput(...args));

	const createMainNode = (props = {}) =>
		createNode('MainType', Object.assign({ code: mainCode }, props));

	it("doesn't write if no real property changes detected", async () => {
		await createMainNode({
			someString: 'some string',
		});
		const dbQuerySpy = spyDbQuery();
		const { status } = await basicHandler({
			someString: 'some string',
		});
		expect(status).toBe(200);
		expect(dbQuerySpy()).not.toHaveBeenCalledWith(
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
		expect(dbQuerySpy()).not.toHaveBeenCalledWith(
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
		expect(dbQuerySpy()).not.toHaveBeenCalledWith(
			expect.stringMatching(/MERGE|CREATE/),
			expect.any(Object),
		);
	});

	it("doesn't write if no real lockField changes detected", async () => {
		await createMainNode({
			someString: 'some string',
			anotherString: 'another string',
			_lockedFields: lock(clientId, 'someString', 'anotherString'),
		});
		const dbQuerySpy = spyDbQuery();
		const { status } = await basicHandler({
			anotherString: 'another string',
			someString: 'some string',
		});
		expect(status).toBe(200);
		expect(dbQuerySpy()).not.toHaveBeenCalledWith(
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
		expect(dbQuerySpy()).toHaveBeenCalledWith(
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
		expect(dbQuerySpy()).toHaveBeenCalledWith(
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
		expect(dbQuerySpy()).toHaveBeenCalledWith(
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
			expect(dbQuerySpy()).toHaveBeenCalledWith(
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
			expect(dbQuerySpy()).not.toHaveBeenCalledWith(
				expect.stringMatching(/MERGE|CREATE/),
				expect.any(Object),
			);
		});
	});
});

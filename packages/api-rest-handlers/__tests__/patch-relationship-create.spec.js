const { patchHandler } = require('../patch');

const { setupMocks, neo4jTest } = require('../../../test-helpers');

describe('rest PATCH relationship create', () => {
	const namespace = 'api-rest-handlers-patch-relationship-create';
	const mainCode = `${namespace}-main`;
	const childCode = `${namespace}-child`;
	const childCode1 = `${childCode}-1`;
	const childCode2 = `${childCode}-2`;

	const {
		createNodes,
		createNode,
		connectNodes,
		meta,
		getMetaPayload,
	} = setupMocks(namespace);

	const getInput = (body, query, metadata = getMetaPayload()) => ({
		type: 'MainType',
		code: mainCode,
		body,
		query,
		metadata,
	});

	const basicHandler = (...args) => patchHandler()(getInput(...args));

	const createMainNode = (props = {}) =>
		createNode('MainType', Object.assign({ code: mainCode }, props));

	it('errors if updating relationships without relationshipAction query string', async () => {
		await createMainNode();
		await expect(
			basicHandler({
				children: [childCode],
			}),
		).rejects.toThrow({
			status: 400,
			message:
				'PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`',
		});

		await neo4jTest('MainType', mainCode).noRels();
	});

	describe('__-to-one relationships', () => {
		['merge', 'replace'].forEach(action => {
			const handler = body =>
				patchHandler()(getInput(body, { relationshipAction: action }));

			it('accept a string', async () => {
				await createNodes(
					['MainType', mainCode],
					['ChildType', childCode],
				);
				const { status, body } = await handler({
					favouriteChild: childCode,
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					favouriteChild: childCode,
				});

				await neo4jTest('MainType', mainCode)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_FAVOURITE_CHILD',
							direction: 'outgoing',
							props: meta.create,
						},
						{
							type: 'ChildType',
							props: Object.assign(
								{
									code: childCode,
								},
								meta.default,
							),
						},
					);
			});
			it('accept an array of length one', async () => {
				await createNodes(
					['MainType', mainCode],
					['ChildType', childCode],
				);
				const { status, body } = await handler({
					favouriteChild: [childCode],
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					favouriteChild: childCode,
				});

				await neo4jTest('MainType', mainCode)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_FAVOURITE_CHILD',
							direction: 'outgoing',
							props: meta.create,
						},
						{
							type: 'ChildType',
							props: Object.assign(
								{
									code: childCode,
								},
								meta.default,
							),
						},
					);
			});
			it('error if trying to write multiple relationships', async () => {
				await createNodes(
					['MainType', mainCode],
					['ChildType', childCode1],
					['ChildType', childCode2],
				);
				await expect(
					basicHandler({
						favouriteChild: [childCode1, childCode2],
					}),
				).rejects.toThrow(/Can only have one favouriteChild/);

				await neo4jTest('MainType', mainCode).noRels();
			});

			it('replace existing relationship', async () => {
				const [main, child1] = await createNodes(
					['MainType', mainCode],
					['ChildType', childCode1],
					['ChildType', childCode2],
				);

				await connectNodes(main, 'HAS_FAVOURITE_CHILD', child1);

				const { status, body } = await handler({
					favouriteChild: childCode2,
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					favouriteChild: childCode2,
				});

				await neo4jTest('MainType', mainCode)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_FAVOURITE_CHILD',
							direction: 'outgoing',
							props: meta.create,
						},
						{
							type: 'ChildType',
							props: Object.assign(
								{
									code: childCode2,
								},
								meta.default,
							),
						},
					);
			});

			it.skip('strictly enforces one-to-__', async () => {
				const [main, child1] = await createNodes(
					['MainType', mainCode],
					['ChildType', childCode1],
					['ChildType', childCode2],
				);

				await connectNodes(main, 'HAS_FAVOURITE_CHILD', child1);

				const { status, body } = await patchHandler()({
					type: 'ChildType',
					code: childCode2,
					body: {
						isFavouriteChildOf: [mainCode],
					},
					query: {
						relationshipAction: action,
					},
					metadata: getMetaPayload(),
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					isFavouriteChildOf: [mainCode],
				});

				await neo4jTest('MainType', mainCode)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_FAVOURITE_CHILD',
							direction: 'outgoing',
							props: meta.create,
						},
						{
							type: 'ChildType',
							props: Object.assign(
								{
									code: childCode2,
								},
								meta.default,
							),
						},
					);
			});

			it.skip(`leaves __-to-__ unchanged`, async () => {
				const [main, child1] = await createNodes(
					['MainType', mainCode],
					['ChildType', childCode1],
					['ChildType', childCode2],
				);

				await connectNodes(main, 'HAS_CHILD', child1);

				const { status, body } = await patchHandler()({
					type: 'ChildType',
					code: childCode2,
					body: {
						isChildOf: [mainCode],
					},
					query: {
						relationshipAction: action,
					},
					metadata: getMetaPayload(),
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					isChildOf: [mainCode],
				});

				await neo4jTest('MainType', mainCode)
					.hasRels(2)
					.hasRel(
						{
							type: 'HAS_CHILD',
							direction: 'outgoing',
							props: meta.create,
						},
						{
							type: 'ChildType',
							props: Object.assign(
								{
									code: childCode2,
								},
								meta.default,
							),
						},
					)
					.hasRel(
						{
							type: 'HAS_CHILD',
							direction: 'outgoing',
							props: meta.default,
						},
						{
							type: 'ChildType',
							props: Object.assign(
								{
									code: childCode1,
								},
								meta.default,
							),
						},
					);
			});
		});
	});
	describe('merge', () => {
		const mergeHandler = body =>
			patchHandler()(getInput(body, { relationshipAction: 'merge' }));
		it('can merge with empty relationship set if relationshipAction=merge', async () => {
			await createNodes(['MainType', mainCode], ['ChildType', childCode]);

			const { status, body } = await mergeHandler({
				children: [childCode],
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				children: [childCode],
			});

			await neo4jTest('MainType', mainCode)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'outgoing',
						props: meta.create,
					},
					{
						type: 'ChildType',
						props: Object.assign({ code: childCode }, meta.default),
					},
				);
		});
		it('can merge with relationships if relationshipAction=merge', async () => {
			const [main, child1] = await createNodes(
				['MainType', mainCode],
				['ChildType', childCode1],
				['ChildType', childCode2],
			);
			await connectNodes(main, ['HAS_CHILD'], child1);

			const { status, body } = await mergeHandler({
				children: [childCode2],
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				children: [childCode2, childCode1],
			});

			await neo4jTest('MainType', mainCode)
				.hasRels(2)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'outgoing',
						props: meta.default,
					},
					{
						type: 'ChildType',
						props: Object.assign(
							{ code: childCode1 },
							meta.default,
						),
					},
				)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'outgoing',
						props: meta.create,
					},
					{
						type: 'ChildType',
						props: Object.assign(
							{ code: childCode2 },
							meta.default,
						),
					},
				);
		});
	});
	describe('replace', () => {
		const replaceHandler = body =>
			patchHandler()(getInput(body, { relationshipAction: 'replace' }));
		it('can replace an empty relationship set if relationshipAction=replace', async () => {
			await createNodes(['MainType', mainCode], ['ChildType', childCode]);

			const { status, body } = await replaceHandler({
				children: [childCode],
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				children: [childCode],
			});

			await neo4jTest('MainType', mainCode)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'outgoing',
						props: meta.create,
					},
					{
						type: 'ChildType',
						props: Object.assign({ code: childCode }, meta.default),
					},
				);
		});

		it('can replace relationships if relationshipAction=replace', async () => {
			const [main, child1] = await createNodes(
				['MainType', mainCode],
				['ChildType', childCode1],
				['ChildType', childCode2],
			);
			await connectNodes(main, ['HAS_CHILD'], child1);

			const { status, body } = await replaceHandler({
				children: [childCode2],
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				children: [childCode2],
			});

			await neo4jTest('MainType', mainCode)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'outgoing',
						props: meta.create,
					},
					{
						type: 'ChildType',
						props: Object.assign(
							{ code: childCode2 },
							meta.default,
						),
					},
				);
		});

		it('leaves relationships in other direction and of other types untouched when replacing', async () => {
			const [main, main2, , child] = await createNodes(
				['MainType', mainCode],
				['MainType', `${mainCode}-2`],
				['MainType', `${mainCode}-3`],
				['ChildType', childCode],
			);
			await connectNodes([main2, 'HAS_YOUNGER_SIBLING', main]);
			await connectNodes([main, 'HAS_CHILD', child]);

			const { status, body } = await replaceHandler({
				youngerSiblings: [`${mainCode}-3`],
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				youngerSiblings: [`${mainCode}-3`],
				olderSiblings: [`${mainCode}-2`],
				children: [childCode],
			});

			await neo4jTest('MainType', mainCode)
				.hasRels(3)
				.hasRel(
					{
						type: 'HAS_YOUNGER_SIBLING',
						direction: 'incoming',
						props: meta.default,
					},
					{
						type: 'MainType',
						props: Object.assign(
							{
								code: `${mainCode}-2`,
							},
							meta.default,
						),
					},
				)
				.hasRel(
					{
						type: 'HAS_YOUNGER_SIBLING',
						direction: 'outgoing',
						props: meta.create,
					},
					{
						type: 'MainType',
						props: Object.assign(
							{
								code: `${mainCode}-3`,
							},
							meta.default,
						),
					},
				)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'outgoing',
						props: meta.default,
					},
					{
						type: 'ChildType',
						props: Object.assign({ code: childCode }, meta.default),
					},
				);
		});

		it('replaces relationships in multiple directions', async () => {
			const [main, main2, main3] = await createNodes(
				['MainType', mainCode],
				['MainType', `${mainCode}-2`],
				['MainType', `${mainCode}-3`],
			);
			await connectNodes([main2, 'HAS_YOUNGER_SIBLING', main]);
			await connectNodes([main, 'HAS_YOUNGER_SIBLING', main3]);

			const { status, body } = await replaceHandler({
				youngerSiblings: [`${mainCode}-2`],
				olderSiblings: [`${mainCode}-3`],
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				youngerSiblings: [`${mainCode}-2`],
				olderSiblings: [`${mainCode}-3`],
			});

			await neo4jTest('MainType', mainCode)
				.hasRels(2)
				.hasRel(
					{
						type: 'HAS_YOUNGER_SIBLING',
						direction: 'incoming',
						props: meta.create,
					},
					{
						type: 'MainType',
						props: Object.assign(
							{
								code: `${mainCode}-3`,
							},
							meta.default,
						),
					},
				)
				.hasRel(
					{
						type: 'HAS_YOUNGER_SIBLING',
						direction: 'outgoing',
						props: meta.create,
					},
					{
						type: 'MainType',
						props: Object.assign(
							{
								code: `${mainCode}-2`,
							},
							meta.default,
						),
					},
				);
		});
	});

	describe('upsert', () => {
		['merge', 'replace'].forEach(action => {
			const handler = (body, query = {}) =>
				patchHandler()(
					getInput(
						body,
						Object.assign({ relationshipAction: action }, query),
					),
				);

			describe(`with ${action}`, () => {
				it(`error when relationship to non-existent node`, async () => {
					await createMainNode();
					await expect(
						handler({ children: [childCode] }),
					).rejects.toThrow('Missing related node');
				});

				it('create node related to non-existent nodes when using upsert=true', async () => {
					await createMainNode();
					const { status, body } = await handler(
						{
							children: [childCode],
						},
						{ upsert: true },
					);

					expect(status).toBe(200);
					expect(body).toMatchObject({
						children: [childCode],
					});

					await neo4jTest('MainType', mainCode)
						.hasRels(1)
						.hasRel(
							{
								type: 'HAS_CHILD',
								direction: 'outgoing',
								props: meta.create,
							},
							{
								type: 'ChildType',
								props: Object.assign(
									{
										code: childCode,
									},
									meta.create,
								),
							},
						);
				});

				it('not leave creation artifacts on things that already existed when using `upsert=true`', async () => {
					await createMainNode();
					await createNode('ChildType', childCode);
					const { status, body } = await handler(
						{
							children: [childCode],
						},
						{ upsert: true },
					);

					expect(status).toBe(200);
					expect(body).toMatchObject({
						children: [childCode],
					});
					await neo4jTest('MainType', mainCode)
						.hasRels(1)
						.hasRel(
							{
								type: 'HAS_CHILD',
								direction: 'outgoing',
								props: meta.create,
							},
							{
								type: 'ChildType',
								props: Object.assign(
									{
										code: childCode,
									},
									meta.default,
								),
							},
						);
				});
			});
		});
	});
});

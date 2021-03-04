const { setupMocks, neo4jTest } = require('../../../test-helpers');

const { patchHandler } = require('../patch');

const patch = patchHandler();

describe('rest PATCH relationship create', () => {
	const namespace = 'api-rest-handlers-patch-relationship-create';
	const branchCode = `${namespace}-branch`;
	const branchCode1 = `${branchCode}-1`;
	const branchCode2 = `${branchCode}-2`;
	const leafCode = `${namespace}-leaf`;
	const leafCode1 = `${leafCode}-1`;
	const leafCode2 = `${leafCode}-2`;

	const {
		createNodes,
		createNode,
		connectNodes,
		stockMetadata,
		getMetaPayload,
	} = setupMocks(namespace);

	const basePayload = {
		type: 'SimpleGraphBranch',
		code: branchCode,
		metadata: getMetaPayload(),
	};

	it('errors if updating relationships without relationshipAction query string', async () => {
		await createNode('SimpleGraphBranch', { code: branchCode });
		await expect(
			patch({
				...basePayload,
				body: {
					leaves: [leafCode],
				},
			}),
		).rejects.httpError({
			status: 400,
			message:
				'PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`',
		});

		await neo4jTest('SimpleGraphBranch', branchCode).noRels();
	});

	describe('__-to-one relationships', () => {
		['merge', 'replace'].forEach(action => {
			const handler = body =>
				patch({
					...basePayload,
					body,
					query: { relationshipAction: action },
				});

			it('accept a string', async () => {
				await createNodes(
					['SimpleGraphBranch', branchCode],
					['SimpleGraphLeaf', leafCode],
				);
				const { status, body } = await handler({
					largestLeaf: leafCode,
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					largestLeaf: leafCode,
				});

				await neo4jTest('SimpleGraphBranch', branchCode)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_LARGEST_LEAF',
							direction: 'outgoing',
							props: stockMetadata.create,
						},
						{
							type: 'SimpleGraphLeaf',
							props: {
								code: leafCode,
								...stockMetadata.default,
							},
						},
					);
			});
			it('accept an array of length one', async () => {
				await createNodes(
					['SimpleGraphBranch', branchCode],
					['SimpleGraphLeaf', leafCode],
				);
				const { status, body } = await handler({
					largestLeaf: [leafCode],
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					largestLeaf: leafCode,
				});

				await neo4jTest('SimpleGraphBranch', branchCode)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_LARGEST_LEAF',
							direction: 'outgoing',
							props: stockMetadata.create,
						},
						{
							type: 'SimpleGraphLeaf',
							props: {
								code: leafCode,
								...stockMetadata.default,
							},
						},
					);
			});
			it('error if trying to write multiple relationships', async () => {
				await createNodes(
					['SimpleGraphBranch', branchCode],
					['SimpleGraphLeaf', leafCode1],
					['SimpleGraphLeaf', leafCode2],
				);
				await expect(
					handler({
						largestLeaf: [leafCode1, leafCode2],
					}),
				).rejects.httpError({
					status: 400,
					message: /Can only have one largestLeaf/,
				});

				await neo4jTest('SimpleGraphBranch', branchCode).noRels();
			});

			it('replace existing relationship', async () => {
				const [main, leaf1] = await createNodes(
					['SimpleGraphBranch', branchCode],
					['SimpleGraphLeaf', leafCode1],
					['SimpleGraphLeaf', leafCode2],
				);

				await connectNodes(main, 'HAS_LARGEST_LEAF', leaf1);

				const { status, body } = await handler({
					largestLeaf: leafCode2,
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					largestLeaf: leafCode2,
				});

				await neo4jTest('SimpleGraphBranch', branchCode)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_LARGEST_LEAF',
							direction: 'outgoing',
							props: stockMetadata.create,
						},
						{
							type: 'SimpleGraphLeaf',
							props: {
								code: leafCode2,
								...stockMetadata.default,
							},
						},
					);
			});

			it('strictly enforces one-to-__', async () => {
				const [branch1, leaf] = await createNodes(
					['SimpleGraphBranch', branchCode1],
					['SimpleGraphBranch', branchCode2],
					['SimpleGraphLeaf', leafCode],
				);

				await connectNodes(branch1, 'HAS_LEAF', leaf);

				const { status, body } = await patch({
					type: 'SimpleGraphBranch',
					code: branchCode2,
					body: {
						leaves: [leafCode],
					},
					query: {
						relationshipAction: action,
					},
					metadata: getMetaPayload(),
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					leaves: [leafCode],
				});

				await neo4jTest('SimpleGraphLeaf', leafCode)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_LEAF',
							direction: 'incoming',
							props: stockMetadata.create,
						},
						{
							type: 'SimpleGraphBranch',
							props: {
								code: branchCode2,
								...stockMetadata.update,
							},
						},
					);
			});

			it(`leaves __-to-__ unchanged`, async () => {
				const [main, leaf1] = await createNodes(
					['SimpleGraphBranch', branchCode],
					['SimpleGraphLeaf', leafCode1],
					['SimpleGraphLeaf', leafCode2],
				);

				await connectNodes(main, 'HAS_LEAF', leaf1);

				const { status, body } = await patch({
					type: 'SimpleGraphLeaf',
					code: leafCode2,
					body: {
						branch: branchCode,
					},
					query: {
						relationshipAction: action,
					},
					metadata: getMetaPayload(),
				});

				expect(status).toBe(200);
				expect(body).toMatchObject({
					branch: branchCode,
				});

				await neo4jTest('SimpleGraphBranch', branchCode)
					.hasRels(2)
					.hasRel(
						{
							type: 'HAS_LEAF',
							direction: 'outgoing',
							props: stockMetadata.create,
						},
						{
							type: 'SimpleGraphLeaf',
							props: {
								code: leafCode2,
								...stockMetadata.update,
							},
						},
					)
					.hasRel(
						{
							type: 'HAS_LEAF',
							direction: 'outgoing',
							props: stockMetadata.default,
						},
						{
							type: 'SimpleGraphLeaf',
							props: {
								code: leafCode1,
								...stockMetadata.default,
							},
						},
					);
			});
		});
	});
	describe('merge', () => {
		const mergeHandler = body =>
			patch({
				...basePayload,
				body,
				query: { relationshipAction: 'merge' },
			});
		it('can merge with empty relationship set if relationshipAction=merge', async () => {
			await createNodes(
				['SimpleGraphBranch', branchCode],
				['SimpleGraphLeaf', leafCode],
			);

			const { status, body } = await mergeHandler({
				leaves: [leafCode],
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				leaves: [leafCode],
			});

			await neo4jTest('SimpleGraphBranch', branchCode)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAS_LEAF',
						direction: 'outgoing',
						props: stockMetadata.create,
					},
					{
						type: 'SimpleGraphLeaf',
						props: { code: leafCode, ...stockMetadata.default },
					},
				);
		});
		it('can merge with relationships if relationshipAction=merge', async () => {
			const [main, leaf1] = await createNodes(
				['SimpleGraphBranch', branchCode],
				['SimpleGraphLeaf', leafCode1],
				['SimpleGraphLeaf', leafCode2],
			);
			await connectNodes(main, ['HAS_LEAF'], leaf1);

			const { status, body } = await mergeHandler({
				leaves: [leafCode2],
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				leaves: [leafCode1, leafCode2],
			});

			await neo4jTest('SimpleGraphBranch', branchCode)
				.hasRels(2)
				.hasRel(
					{
						type: 'HAS_LEAF',
						direction: 'outgoing',
						props: stockMetadata.default,
					},
					{
						type: 'SimpleGraphLeaf',
						props: {
							code: leafCode1,
							...stockMetadata.default,
						},
					},
				)
				.hasRel(
					{
						type: 'HAS_LEAF',
						direction: 'outgoing',
						props: stockMetadata.create,
					},
					{
						type: 'SimpleGraphLeaf',
						props: {
							code: leafCode2,
							...stockMetadata.default,
						},
					},
				);
		});
	});
	describe('replace', () => {
		const replaceHandler = body =>
			patch({
				...basePayload,
				body,
				query: { relationshipAction: 'replace' },
			});
		it('can replace an empty relationship set if relationshipAction=replace', async () => {
			await createNodes(
				['SimpleGraphBranch', branchCode],
				['SimpleGraphLeaf', leafCode],
			);

			const { status, body } = await replaceHandler({
				leaves: [leafCode],
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				leaves: [leafCode],
			});

			await neo4jTest('SimpleGraphBranch', branchCode)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAS_LEAF',
						direction: 'outgoing',
						props: stockMetadata.create,
					},
					{
						type: 'SimpleGraphLeaf',
						props: { code: leafCode, ...stockMetadata.default },
					},
				);
		});

		it('can replace relationships if relationshipAction=replace', async () => {
			const [main, leaf1] = await createNodes(
				['SimpleGraphBranch', branchCode],
				['SimpleGraphLeaf', leafCode1],
				['SimpleGraphLeaf', leafCode2],
			);
			await connectNodes(main, ['HAS_LEAF'], leaf1);

			const { status, body } = await replaceHandler({
				leaves: [leafCode2],
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				leaves: [leafCode2],
			});

			await neo4jTest('SimpleGraphBranch', branchCode)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAS_LEAF',
						direction: 'outgoing',
						props: stockMetadata.create,
					},
					{
						type: 'SimpleGraphLeaf',
						props: {
							code: leafCode2,
							...stockMetadata.default,
						},
					},
				);
		});

		it('leaves relationships in other direction and of other types untouched when replacing', async () => {
			const [main, main2, , leaf] = await createNodes(
				['SimpleGraphBranch', branchCode],
				['SimpleGraphBranch', `${branchCode}-2`],
				['SimpleGraphBranch', `${branchCode}-3`],
				['SimpleGraphLeaf', leafCode],
			);
			await connectNodes([main2, 'HAS_CHILD', main]);
			await connectNodes([main, 'HAS_LEAF', leaf]);

			const { status, body } = await replaceHandler({
				children: [`${branchCode}-3`],
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				children: [`${branchCode}-3`],
				parent: `${branchCode}-2`,
				leaves: [leafCode],
			});

			await neo4jTest('SimpleGraphBranch', branchCode)
				.hasRels(3)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'incoming',
						props: stockMetadata.default,
					},
					{
						type: 'SimpleGraphBranch',
						props: {
							code: `${branchCode}-2`,
							...stockMetadata.default,
						},
					},
				)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'outgoing',
						props: stockMetadata.create,
					},
					{
						type: 'SimpleGraphBranch',
						props: {
							code: `${branchCode}-3`,
							...stockMetadata.default,
						},
					},
				)
				.hasRel(
					{
						type: 'HAS_LEAF',
						direction: 'outgoing',
						props: stockMetadata.default,
					},
					{
						type: 'SimpleGraphLeaf',
						props: { code: leafCode, ...stockMetadata.default },
					},
				);
		});

		it('replaces relationships in multiple directions', async () => {
			const [main, main2, main3] = await createNodes(
				['SimpleGraphBranch', branchCode],
				['SimpleGraphBranch', `${branchCode}-2`],
				['SimpleGraphBranch', `${branchCode}-3`],
			);
			await connectNodes([main2, 'HAS_CHILD', main]);
			await connectNodes([main, 'HAS_CHILD', main3]);

			const { status, body } = await replaceHandler({
				children: [`${branchCode}-2`],
				parent: `${branchCode}-3`,
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				children: [`${branchCode}-2`],
				parent: `${branchCode}-3`,
			});

			await neo4jTest('SimpleGraphBranch', branchCode)
				.hasRels(2)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'incoming',
						props: stockMetadata.create,
					},
					{
						type: 'SimpleGraphBranch',
						props: {
							code: `${branchCode}-3`,
							...stockMetadata.default,
						},
					},
				)
				.hasRel(
					{
						type: 'HAS_CHILD',
						direction: 'outgoing',
						props: stockMetadata.create,
					},
					{
						type: 'SimpleGraphBranch',
						props: {
							code: `${branchCode}-2`,
							...stockMetadata.default,
						},
					},
				);
		});
	});

	describe('upsert', () => {
		['merge', 'replace'].forEach(action => {
			const handler = (body, query = {}) =>
				patch({
					...basePayload,
					body,
					query: { relationshipAction: action, ...query },
				});

			describe(`with ${action}`, () => {
				it(`error when relationship to non-existent node`, async () => {
					await createNode('SimpleGraphBranch', { code: branchCode });
					await expect(
						handler({ leaves: [leafCode] }),
					).rejects.httpError({
						status: 400,
						message: 'Missing related node',
					});
				});

				it('create node related to non-existent nodes when using upsert=true', async () => {
					await createNode('SimpleGraphBranch', { code: branchCode });
					const { status, body } = await handler(
						{
							leaves: [leafCode],
						},
						{ upsert: true },
					);

					expect(status).toBe(200);
					expect(body).toMatchObject({
						leaves: [leafCode],
					});

					await neo4jTest('SimpleGraphBranch', branchCode)
						.hasRels(1)
						.hasRel(
							{
								type: 'HAS_LEAF',
								direction: 'outgoing',
								props: stockMetadata.create,
							},
							{
								type: 'SimpleGraphLeaf',
								props: {
									code: leafCode,
									...stockMetadata.create,
								},
							},
						);
				});

				it('not leave creation artifacts on things that already existed when using `upsert=true`', async () => {
					await createNode('SimpleGraphBranch', { code: branchCode });
					await createNode('SimpleGraphLeaf', leafCode);
					const { status, body } = await handler(
						{
							leaves: [leafCode],
						},
						{ upsert: true },
					);

					expect(status).toBe(200);
					expect(body).toMatchObject({
						leaves: [leafCode],
					});
					await neo4jTest('SimpleGraphBranch', branchCode)
						.hasRels(1)
						.hasRel(
							{
								type: 'HAS_LEAF',
								direction: 'outgoing',
								props: stockMetadata.create,
							},
							{
								type: 'SimpleGraphLeaf',
								props: {
									code: leafCode,
									...stockMetadata.default,
								},
							},
						);
				});
			});
		});
	});
});

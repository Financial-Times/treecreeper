const { setupMocks, neo4jTest } = require('../../../test-helpers');

const { patchHandler } = require('../patch');

const patch = patchHandler();
describe('rest PATCH relationship delete', () => {
	const namespace = 'api-rest-handlers-patch-relationship-delete';
	const branchCode = `${namespace}-branch`;
	const branchCode2 = `${branchCode}2`;
	const branchCode3 = `${branchCode}3`;
	const leafCode = `${namespace}-leaf`;
	const parentCode = `${namespace}-parent`;
	const leafCode1 = `${leafCode}1`;
	const leafCode2 = `${leafCode}2`;
	const leafCode3 = `${leafCode}3`;

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

	describe('relationshipAction query string', () => {
		['updating', 'creating'].forEach(mode => {
			it(`${mode}: throws 400 if no relationshipAction query string when batch deleting`, async () => {
				if (mode === 'updating') {
					await createNode('SimpleGraphBranch', { code: branchCode});;
				}
				await expect(
					patch({
						...basePayload,
						body: {
							leaves: null,
						},
					}),
				).rejects.httpError({
					status: 400,
					message:
						'PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`',
				});
			});
			it(`${mode}: throws 400 if no relationshipAction query string when deleting specific relationships`, async () => {
				if (mode === 'updating') {
					await createNode('SimpleGraphBranch', { code: branchCode});;
				}
				await expect(
					patch({
						...basePayload,
						body: {
							'!leaves': [leafCode],
						},
					}),
				).rejects.httpError({
					status: 400,
					message:
						'PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`',
				});
			});
		});
	});

	it('deletes all relationships when replacing with an empty array', async () => {
		const [main, leaf1, leaf2] = await createNodes(
			['SimpleGraphBranch', branchCode],
			['SimpleGraphLeaf', leafCode1],
			['SimpleGraphLeaf', leafCode2],
		);
		await connectNodes(
			[main, 'HAS_LEAF', leaf1],
			[main, 'HAS_LEAF', leaf2],
		);
		const { status, body } = await patch(
			{...basePayload, body:
				{
					leaves: [],
				},
				query: { relationshipAction: 'replace' },
			})

		expect(status).toBe(200);
		expect(body).not.toMatchObject({
			leaves: [leafCode1, leafCode2],
		});

		await neo4jTest('SimpleGraphBranch', branchCode).noRels();
	});

	['merge', 'replace'].forEach(action =>
		describe(`with ${action} action`, () => {
			const handler = body =>
				patch({
					...basePayload,
					body,
					query: { relationshipAction: action },
				});
			describe('individual relationship delete', () => {
				it('can delete a specific relationship', async () => {
					const [main, leaf1, leaf2] = await createNodes(
						['SimpleGraphBranch', branchCode],
						['SimpleGraphLeaf', leafCode1],
						['SimpleGraphLeaf', leafCode2],
					);
					await connectNodes(
						[main, 'HAS_LEAF', leaf1],
						[main, 'HAS_LEAF', leaf2],
					);
					const { status, body } = await handler({
						'!leaves': [leafCode1],
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
								props: stockMetadata.default,
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

				it("can attempt to delete a specific relationship of a kind that doesn't exist", async () => {
					await createNode('SimpleGraphBranch', branchCode);
					const { status, body } = await handler({
						'!leaves': [leafCode1],
					});
					expect(status).toBe(200);
					expect(body).not.toMatchObject({
						leaves: expect.any(Array),
					});

					await neo4jTest('SimpleGraphBranch', branchCode).noRels();
				});

				it("can attempt to delete a specific relationship that doesn't exist", async () => {
					const [main, leaf1] = await createNodes(
						['SimpleGraphBranch', branchCode],
						['SimpleGraphLeaf', leafCode1],
					);
					await connectNodes(main, 'HAS_LEAF', leaf1);
					const { status, body } = await handler({
						'!leaves': [leafCode2],
					});
					expect(status).toBe(200);
					expect(body).toMatchObject({
						leaves: [leafCode1],
					});

					await neo4jTest('SimpleGraphBranch', branchCode)
						.hasRels(1)
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

				it('can delete multiple specific relationships of the same kind', async () => {
					const [main, leaf1, leaf2, leaf3] = await createNodes(
						['SimpleGraphBranch', branchCode],
						['SimpleGraphLeaf', leafCode1],
						['SimpleGraphLeaf', leafCode2],
						['SimpleGraphLeaf', leafCode3],
					);
					await connectNodes(
						[main, 'HAS_LEAF', leaf1],
						[main, 'HAS_LEAF', leaf2],
						[main, 'HAS_LEAF', leaf3],
					);
					const { status, body } = await handler({
						'!leaves': [leafCode1, leafCode3],
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
								props: stockMetadata.default,
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

				it('can delete multiple specific relationships of different kinds', async () => {
					const [main, leaf, parent] = await createNodes(
						['SimpleGraphBranch', branchCode],
						['SimpleGraphLeaf', leafCode],
						['SimpleGraphBranch', parentCode],
					);
					await connectNodes(
						[main, 'HAS_LEAF', leaf],
						[parent, 'HAS_CHILD', main],
					);
					const { status, body } = await handler({
						'!leaves': [leafCode],
						'!parent': [parentCode],
					});
					expect(status).toBe(200);
					expect(body).not.toMatchObject({
						leaves: expect.any(Array),
						parent: expect.any(Array),
					});

					await neo4jTest('SimpleGraphBranch', branchCode).noRels();
				});
				it('leaves relationships in the opposite direction unaffected', async () => {
					const [main, main2, main3] = await createNodes(
						['SimpleGraphBranch', branchCode],
						['SimpleGraphBranch', `${branchCode}2`],
						['SimpleGraphBranch', `${branchCode}3`],
					);
					await connectNodes(
						[main2, 'HAS_CHILD', main],
						[main, 'HAS_CHILD', main3],
					);
					const { status, body } = await handler({
						'!children': [`${branchCode}3`],
					});
					expect(status).toBe(200);
					expect(body).toMatchObject({
						parent: `${branchCode}2`,
					});
					await neo4jTest('SimpleGraphBranch', branchCode)
						.hasRels(1)
						.hasRel(
							{
								type: 'HAS_CHILD',
								direction: 'incoming',
								props: stockMetadata.default,
							},
							{
								type: 'SimpleGraphBranch',
								props: {
									code: `${branchCode}2`,
									...stockMetadata.default,
								},
							},
						);
				});

				it('can add and remove relationships of the same type at the same time', async () => {
					const [main, leaf1] = await createNodes(
						['SimpleGraphBranch', branchCode],
						['SimpleGraphLeaf', leafCode1],
						['SimpleGraphLeaf', leafCode2],
					);
					await connectNodes([main, 'HAS_LEAF', leaf1]);
					const { status, body } = await handler({
						'!leaves': [leafCode1],
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
				it('errors if deleting and adding the same relationship to the same record', async () => {
					await createNodes(
						['SimpleGraphBranch', branchCode],
						['SimpleGraphLeaf', leafCode],
					);
					await expect(
						handler({
							leaves: [leafCode],
							'!leaves': [leafCode],
						}),
					).rejects.httpError({
						status: 400,
						message:
							'Trying to add and remove a relationship to a record at the same time',
					});
					await neo4jTest('SimpleGraphBranch', branchCode).noRels();
				});
			});
			describe('bulk relationship delete', () => {
				it('can delete empty relationship set', async () => {
					await createNode('SimpleGraphBranch', branchCode);
					const { status, body } = await handler({
						leaves: null,
					});
					expect(status).toBe(200);
					expect(body).not.toMatchObject({
						leaves: expect.any(Array),
					});

					await neo4jTest('SimpleGraphBranch', branchCode).noRels();
				});

				it('can delete entire relationship sets', async () => {
					const [main, leaf, parent] = await createNodes(
						['SimpleGraphBranch', branchCode],
						['SimpleGraphLeaf', leafCode],
						['SimpleGraphBranch', parentCode],
					);
					await connectNodes(
						// tests incoming and outgoing relationships
						[parent, 'HAS_CHILD', main],
						[main, 'HAS_LEAF', leaf],
					);
					const { status, body } = await handler({
						leaves: null,
						parent: null,
					});
					expect(status).toBe(200);
					expect(body).not.toMatchObject({
						leaves: expect.any(Array),
					});
					expect(body).not.toMatchObject({
						parent: expect.any(Array),
					});
					await neo4jTest('SimpleGraphBranch', branchCode).noRels();
				});

				it('leaves other similar relationships on destination node untouched when deleting', async () => {
					const [main, main2, leaf] = await createNodes(
						['SimpleGraphBranch', branchCode],
						['SimpleGraphBranch', branchCode2],
						['SimpleGraphLeaf', leafCode],
					);
					await connectNodes([main, 'HAS_LEAF', leaf]);
					await connectNodes([main2, 'HAS_LEAF', leaf]);

					const { status, body } = await handler({
						leaves: null,
					});
					expect(status).toBe(200);
					expect(body).not.toMatchObject({
						leaves: expect.any(Array),
					});

					await neo4jTest('SimpleGraphBranch', branchCode2)
						.hasRels(1)
						.hasRel(
							{
								type: 'HAS_LEAF',
								direction: 'outgoing',
								props: stockMetadata.default,
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

				it('leaves relationships in other direction and of other types untouched when deleting', async () => {
					const [main, main2, main3, leaf] = await createNodes(
						['SimpleGraphBranch', branchCode],
						['SimpleGraphBranch', branchCode2],
						['SimpleGraphBranch', branchCode3],
						['SimpleGraphLeaf', leafCode],
					);
					await connectNodes([main2, 'HAS_CHILD', main]);
					await connectNodes([main, 'HAS_CHILD', main3]);
					await connectNodes([main, 'HAS_LEAF', leaf]);

					const { status, body } = await handler({
						children: null,
					});
					expect(status).toBe(200);
					expect(body).toMatchObject({
						parent: branchCode2,
						leaves: [leafCode],
					});
					expect(body).not.toMatchObject({
						children: expect.any(Array),
					});

					await neo4jTest('SimpleGraphBranch', branchCode)
						.hasRels(2)
						.hasRel(
							{
								type: 'HAS_CHILD',
								direction: 'incoming',
								props: stockMetadata.default,
							},
							{
								type: 'SimpleGraphBranch',
								props: {
									code: branchCode2,
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
								props: {
									code: leafCode,
									...stockMetadata.default,
								},
							},
						);
				});
			});
		}),
	);
});

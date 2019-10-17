const { patchHandler } = require('../patch');

const { setupMocks, neo4jTest } = require('../../../test-helpers');

describe('rest PATCH relationship delete', () => {
	const namespace = 'api-rest-handlers-patch-relationship-delete';
	const mainCode = `${namespace}-main`;
	const mainCode2 = `${mainCode}2`;
	const mainCode3 = `${mainCode}3`;
	const childCode = `${namespace}-child`;
	const parentCode = `${namespace}-parent`;
	const childCode1 = `${childCode}1`;
	const childCode2 = `${childCode}2`;
	const childCode3 = `${childCode}3`;

	const { createNodes, createNode, connectNodes, meta } = setupMocks(
		namespace,
	);

	const getInput = (body, query, metadata) => ({
		type: 'MainType',
		code: mainCode,
		body,
		query,
		metadata,
	});

	const basicHandler = (...args) => patchHandler()(getInput(...args));

	const createMainNode = (props = {}) =>
		createNode('MainType', Object.assign({ code: mainCode }, props));

	describe('relationshipAction query string', () => {
		['updating', 'creating'].forEach(mode => {
			it(`${mode}: throws 400 if no relationshipAction query string when batch deleting`, async () => {
				if (mode === 'updating') {
					await createMainNode();
				}
				await expect(
					basicHandler({
						children: null,
					}),
				).rejects.toThrow({
					status: 400,
					message:
						'PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`',
				});
			});
			it(`${mode}: throws 400 if no relationshipAction query string when deleting specific relationships`, async () => {
				if (mode === 'updating') {
					await createMainNode();
				}
				await expect(
					basicHandler({
						'!children': [childCode],
					}),
				).rejects.toThrow({
					status: 400,
					message:
						'PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`',
				});
			});
		});
	});
	['merge', 'replace'].forEach(action =>
		describe(`with ${action} action`, () => {
			const handler = body =>
				patchHandler()(getInput(body, { relationshipAction: action }));
			describe('individual relationship delete', () => {
				it('can delete a specific relationship', async () => {
					const [main, child1, child2] = await createNodes(
						['MainType', mainCode],
						['ChildType', childCode1],
						['ChildType', childCode2],
					);
					await connectNodes(
						[main, 'HAS_CHILD', child1],
						[main, 'HAS_CHILD', child2],
					);
					const { status, body } = await handler({
						'!children': [childCode1],
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
								props: meta.default,
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

				it("can attempt to delete a specific relationship of a kind that doesn't exist", async () => {
					await createNode('MainType', mainCode);
					const { status, body } = await handler({
						'!children': [childCode1],
					});
					expect(status).toBe(200);
					expect(body).not.toMatchObject({
						children: expect.any(Array),
					});

					await neo4jTest('MainType', mainCode).noRels();
				});

				it("can attempt to delete a specific relationship that doesn't exist", async () => {
					const [main, child1] = await createNodes(
						['MainType', mainCode],
						['ChildType', childCode1],
					);
					await connectNodes(main, 'HAS_CHILD', child1);
					const { status, body } = await handler({
						'!children': [childCode2],
					});
					expect(status).toBe(200);
					expect(body).toMatchObject({
						children: [childCode1],
					});

					await neo4jTest('MainType', mainCode)
						.hasRels(1)
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
						);
				});

				it('can delete multiple specific relationships of the same kind', async () => {
					const [main, child1, child2, child3] = await createNodes(
						['MainType', mainCode],
						['ChildType', childCode1],
						['ChildType', childCode2],
						['ChildType', childCode3],
					);
					await connectNodes(
						[main, 'HAS_CHILD', child1],
						[main, 'HAS_CHILD', child2],
						[main, 'HAS_CHILD', child3],
					);
					const { status, body } = await handler({
						'!children': [childCode1, childCode3],
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
								props: meta.default,
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

				it('can delete multiple specific relationships of different kinds', async () => {
					const [main, child, parent] = await createNodes(
						['MainType', mainCode],
						['ChildType', childCode],
						['ParentType', parentCode],
					);
					await connectNodes(
						[main, 'HAS_CHILD', child],
						[parent, 'IS_PARENT_OF', main],
					);
					const { status, body } = await handler({
						'!children': [childCode],
						'!parents': [parentCode],
					});
					expect(status).toBe(200);
					expect(body).not.toMatchObject({
						children: expect.any(Array),
						parents: expect.any(Array),
					});

					await neo4jTest('MainType', mainCode).noRels();
				});
				it('leaves relationships in the opposite direction unaffected', async () => {
					const [main, main2, main3] = await createNodes(
						['MainType', mainCode],
						['MainType', `${mainCode}2`],
						['MainType', `${mainCode}3`],
					);
					await connectNodes(
						[main2, 'HAS_YOUNGER_SIBLING', main],
						[main, 'HAS_YOUNGER_SIBLING', main3],
					);
					const { status, body } = await handler({
						'!youngerSiblings': [`${mainCode}3`],
					});
					expect(status).toBe(200);
					expect(body).toMatchObject({
						olderSiblings: [`${mainCode}2`],
					});
					await neo4jTest('MainType', mainCode)
						.hasRels(1)
						.hasRel(
							{
								type: 'HAS_YOUNGER_SIBLING',
								direction: 'outgoing',
								props: meta.default,
							},
							{
								type: 'MainType',
								props: Object.assign(
									{ code: `${mainCode}1` },
									meta.default,
								),
							},
						);
				});

				it('can add and remove relationships of the same type at the same time', async () => {
					const [main, child1] = await createNodes(
						['MainType', mainCode],
						['ChildType', childCode1],
						['ChildType', childCode2],
					);
					await connectNodes([main, 'HAS_CHILD', child1]);
					const { status, body } = await handler({
						'!children': [childCode1],
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
								props: meta.default,
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
				it('errors if deleting and adding the same relationship to the same record', async () => {
					await createNodes(
						['MainType', mainCode],
						['ChildType', childCode],
					);
					await expect(
						handler({
							children: [childCode],
							'!children': [childCode],
						}),
					).rejects.toThrow({
						status: 400,
						message:
							'Trying to add and remove a relationship to a record at the same time',
					});
					await neo4jTest('MainType', mainCode).noRels();
				});
			});
			describe('bulk relationship delete', () => {
				it('can delete empty relationship set', async () => {
					await createNode('MainType', mainCode);
					const { status, body } = await handler({
						children: null,
					});
					expect(status).toBe(200);
					expect(body).not.toMatchObject({
						children: expect.any(Array),
					});

					await neo4jTest('MainType', mainCode).noRels();
				});

				it('can delete entire relationship sets', async () => {
					const [main, child, parent] = await createNodes(
						['MainType', mainCode],
						['ChildType', childCode],
						['ParentType', parentCode],
					);
					await connectNodes(
						// tests incoming and outgoing relationships
						[parent, 'IS_PARENT_OF', main],
						[main, 'HAS_CHILD', child],
					);
					const { status, body } = await handler({
						children: null,
						parents: null,
					});
					expect(status).toBe(200);
					expect(body).not.toMatchObject({
						children: expect.any(Array),
					});
					expect(body).not.toMatchObject({
						parents: expect.any(Array),
					});
					await neo4jTest('MainType', mainCode).noRels();
				});

				it('leaves other similar relationships on destination node untouched when deleting', async () => {
					const [main, main2, child] = await createNodes(
						['MainType', mainCode],
						['MainType', mainCode2],
						['ChildType', childCode],
					);
					await connectNodes([main, 'HAS_CHILD', child]);
					await connectNodes([main2, 'HAS_CHILD', child]);

					const { status, body } = await handler({
						children: null,
					});
					expect(status).toBe(200);
					expect(body).not.toMatchObject({
						children: expect.any(Array),
					});

					await neo4jTest('MainType', mainCode2)
						.hasRels(1)
						.hasRel(
							{
								type: 'HAS_CHILD',
								direction: 'outgoing',
								props: meta.default,
							},
							{
								type: 'ChildType',
								props: Object.assign(
									{ code: childCode },
									meta.default,
								),
							},
						);
				});

				it('leaves relationships in other direction and of other types untouched when deleting', async () => {
					const [main, main2, main3, child] = await createNodes(
						['MainType', mainCode],
						['MainType', mainCode2],
						['MainType', mainCode3],
						['ChildType', childCode],
					);
					await connectNodes([main2, 'HAS_YOUNGER_SIBLING', main]);
					await connectNodes([main, 'HAS_YOUNGER_SIBLING', main3]);
					await connectNodes([main, 'HAS_CHILD', child]);

					const { status, body } = await handler({
						youngerSiblings: null,
					});
					expect(status).toBe(200);
					expect(body).toMatchObject({
						olderSiblings: [`${mainCode}-1`],
						children: [childCode],
					});
					expect(body).not.toMatchObject({
						youngerSiblings: expect.any(Array),
					});

					await neo4jTest('MainType', mainCode)
						.hasRels(2)
						.hasRel(
							{
								type: 'HAS_YOUNGER_SIBLING',
								direction: 'incoming',
								props: meta.default,
							},
							{
								type: 'MainType',
								props: meta.default,
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
									{ code: childCode },
									meta.default,
								),
							},
						);
				});
			});
		}),
	);
});

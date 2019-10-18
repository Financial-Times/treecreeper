const { absorbHandler } = require('../absorb');

const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');

describe('rest DELETE', () => {
	const namespace = 'api-rest-handlers-absorb';
	const mainCode = `${namespace}-main`;
	const absorbedCode = `${namespace}-absorbed`;
	const childCode = `${namespace}-child`;
	const parentCode = `${namespace}-parent`;

	const { createNodes, createNode, connectNodes, meta } = setupMocks(
		namespace,
	);

	const absorb = absorbHandler()({
		type: 'MainType',
		code: mainCode,
		body: { code: absorbedCode },
	});

	const createNodePair = (mainBody = {}, absorbedBody = {}) =>
		createNodes(
			[
				'MainType',
				Object.assign(
					{
						code: mainCode,
					},
					mainBody,
				),
			],
			[
				'MainType',
				Object.assign(
					{
						code: absorbedCode,
					},
					absorbedBody,
				),
			],
		);

	describe('error handling', () => {
		it('responds with 500 if neo4j query fails', async () => {
			await createNodePair(
				{ someString: 'fake1' },
				{ someString: 'fake2' },
			);
			dbUnavailable();
			await expect(absorb());
		});

		it('errors if no code to absorb supplied', async () => {
			await createNode('MainType', {
				code: mainCode,
				someString: 'fake1',
			});
			await expect(
				absorbHandler()({
					type: 'MainType',
					code: mainCode,
					body: {},
				}),
			).rejects.toThrow({
				status: 400,
				message: 'oh no',
			});
			await neo4jTest('MainType', mainCode).match({
				code: mainCode,
				someString: 'fake1',
			});
		});

		it('errors if code to absorb does not exist', async () => {
			await createNode('MainType', {
				code: mainCode,
				someString: 'fake1',
			});
			await expect(
				absorbHandler()({
					type: 'MainType',
					code: mainCode,
					body: { code: absorbedCode },
				}),
			).rejects.toThrow({
				status: 404,
				message: 'oh no',
			});
			await neo4jTest('MainType', mainCode).match({
				code: mainCode,
				someString: 'fake1',
			});
		});
		it('errors if destination code does not exist', async () => {
			await createNode('MainType', {
				code: absorbedCode,
				someString: 'fake2',
			});
			await expect(
				absorbHandler()({
					type: 'MainType',
					code: mainCode,
					body: { code: absorbedCode },
				}),
			).rejects.toThrow({
				status: 404,
				message: 'oh no',
			});
			await neo4jTest('MainType', absorbedCode).match({
				code: absorbedCode,
				someString: 'fake2',
			});
		});
	});
	describe('successful application', () => {
		describe('properties', () => {
			it('merges unconnected nodes', async () => {
				await createNodePair();

				const { status } = await absorb();
				expect(status).toBe(200);

				await neo4jTest('MainType', mainCode).exists();
				await neo4jTest('MainType', absorbedCode).notExists();
			});

			it('not modify existing properties of destination node', async () => {
				await createNodePair(
					{ someString: 'potato' },
					{ someString: 'tomato' },
				);
				const { status, body } = await absorb();
				expect(status).toBe(200);
				expect(body).toMatchObject({
					someString: 'potato',
				});
				await neo4jTest('MainType', mainCode).match({
					someString: 'potato',
				});
			});

			it('add new properties to destination node', async () => {
				await createNodePair(undefined, { someString: 'potato' });
				const { status, body } = await absorb();
				expect(status).toBe(200);
				expect(body).toMatchObject({
					someString: 'potato',
				});
				await neo4jTest('MainType', mainCode).match({
					someString: 'potato',
				});
			});

			it("doesn't error when unrecognised properties exist", async () => {
				await createNodePair(undefined, { notInSchema: 'someVal' });
				const { status, body } = await absorb();
				expect(status).toBe(200);
				expect(body).not.toMatchObject({
					notInSchema: expect.any(String),
				});

				await neo4jTest('MainType', mainCode).match({
					notInSchema: 'someVal',
				});
				await neo4jTest('MainType', absorbedCode).notExists();
			});
		});

		describe('relationships', () => {
			it('move outgoing relationships', async () => {
				const [, absorbed] = await createNodePair();
				const child = await createNode('ChildType', childCode);
				await connectNodes(absorbed, 'HAS_CHILD', child);

				const { status, body } = await absorb();
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
				await neo4jTest('MainType', absorbedCode).notExists();
			});

			it('move incoming relationships', async () => {
				const [, absorbed] = await createNodePair();
				const parent = await createNode('ParentType', parentCode);
				await connectNodes(parent, 'IS_PARENT_OF', absorbed);

				const { status, body } = await absorb();
				expect(status).toBe(200);
				expect(body).toMatchObject({
					parents: [parentCode],
				});

				await neo4jTest('MainType', mainCode)
					.hasRels(1)
					.hasRel(
						{
							type: 'IS_PARENT_OF',
							direction: 'incoming',
							props: meta.default,
						},
						{
							type: 'ParentType',
							props: Object.assign(
								{ code: parentCode },
								meta.default,
							),
						},
					);
				await neo4jTest('MainType', absorbedCode).notExists();
			});

			it('merges identical relationships', async () => {
				const [main, absorbed] = await createNodePair();
				const child = await createNode('ChildType', childCode);

				await connectNodes(
					[main, 'HAS_CHILD', child],
					[absorbed, 'HAS_CHILD', child],
				);

				const { status, body } = await absorb();
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

				await neo4jTest('MainType', absorbedCode).notExists();
			});

			it('discard any newly reflexive relationships', async () => {
				const [main, absorbed] = await createNodePair(
					mainCode,
					absorbedCode,
				);
				await connectNodes(main, 'HAS_YOUNGER_SIBLING', absorbed);
				const { status, body } = await absorb();
				expect(status).toBe(200);
				expect(body).not.toMatchObject({
					youngerSiblings: expect.any(Array),
				});
				expect(body).not.toMatchObject({
					olderSiblings: expect.any(Array),
				});

				await neo4jTest('MainType', mainCode).hasRels(0);

				await neo4jTest('MainType', absorbedCode).notExists();
			});

			it('does not overwrite __-to-one relationships', async () => {
				const [main, absorbed] = await createNodePair();

				const [child1, child2] = await createNodes(
					['ChildType', `${namespace}-child1`],
					['ChildType', `${namespace}-child2`],
				);

				await connectNodes(
					[main, 'HAS_FAVOURITE_CHILD', child1],
					[absorbed, 'HAS_FAVOURITE_CHILD', child2],
				);

				const { status, body } = await absorb();
				expect(status).toBe(200);
				expect(body).toMatchObject({
					favouriteChild: `${namespace}-child1`,
				});

				await neo4jTest('MainType', mainCode)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_FAVOURITE_CHILD',
							direction: 'outgoing',
							props: meta.default,
						},
						{
							type: 'ChildType',
							props: Object.assign(
								{ code: `${namespace}-child1` },
								meta.default,
							),
						},
					);

				await neo4jTest('MainType', absorbedCode).notExists();
			});
		});
	});
});

const { setupMocks, neo4jTest } = require('@financial-times/tc-test-helpers');
const {
	dbUnavailable,
} = require('@financial-times/tc-test-helpers/error-stubs');

const { absorbHandler } = require('../absorb');

describe('rest POST (absorb)', () => {
	const namespace = 'api-rest-handlers-absorb';
	const mainCode = `${namespace}-main`;
	const absorbedCode = `${namespace}-absorbed`;
	const childCode = `${namespace}-child`;
	const parentCode = `${namespace}-parent`;

	const { createNodes, createNode, connectNodes, meta } = setupMocks(
		namespace,
	);

	const documentStore = {};

	beforeEach(() => {
		documentStore.absorb = jest.fn(async () => ({}));
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	const absorb = absorbHandler({ documentStore });
	const getInput = override =>
		override || {
			type: 'MainType',
			code: mainCode,
			codeToAbsorb: absorbedCode,
		};

	const createNodePair = (mainBody, absorbedBody) => {
		const nodes = [
			[
				'MainType',
				{
					code: mainCode,
					...(mainBody || {}),
				},
			],
			[
				'MainType',
				{
					code: absorbedCode,
					...(absorbedBody || {}),
				},
			],
		];
		return createNodes(...nodes);
	};

	describe('error handling', () => {
		it('responds with 500 if neo4j query fails', async () => {
			await createNodePair();
			dbUnavailable();
			await expect(absorb(getInput())).rejects.toThrow(Error);
		});

		it('errors if unexpected code to abosorb supplied', async () => {
			await createNodePair();
			await expect(
				absorb(
					getInput({
						type: 'MainType',
						code: mainCode,
						codeToAbsorb: `${absorbedCode}@@@@@`,
					}),
				),
			).rejects.httpError({
				status: 400,
				message: /Invalid value.+codeToAbsorb/,
			});
		});

		it('errors if no code to absorb supplied', async () => {
			await createNodePair();
			await expect(
				absorb(
					getInput({
						type: 'MainType',
						code: mainCode,
					}),
				),
			).rejects.httpError({
				status: 400,
				message: /Invalid value.+codeToAbsorb/,
			});
			await neo4jTest('MainType', mainCode).match({
				code: mainCode,
			});
		});

		it('errors if main code does not exist', async () => {
			await createNode('MainType', {
				code: absorbedCode,
				someString: 'fake1',
			});
			await expect(absorbHandler()(getInput())).rejects.httpError({
				status: 404,
				message: `MainType record missing for \`code\``,
			});
			await neo4jTest('MainType', absorbedCode).match({
				code: absorbedCode,
				someString: 'fake1',
			});
		});

		it('errors if code to absorb does not exist', async () => {
			await createNode('MainType', {
				code: mainCode,
				someString: 'fake2',
			});
			await expect(absorbHandler()(getInput())).rejects.httpError({
				status: 404,
				message: `MainType record missing for \`codeToAbsorb\``,
			});
			await neo4jTest('MainType', mainCode).match({
				code: mainCode,
				someString: 'fake2',
			});
		});
	});

	describe('successful application', () => {
		describe('properties', () => {
			it('merges unconnected nodes', async () => {
				await createNodePair();

				const { status } = await absorb(getInput());
				expect(status).toBe(200);

				await neo4jTest('MainType', mainCode).exists();
				await neo4jTest('MainType', absorbedCode).notExists();
			});

			it('not modify existing properties of destination node', async () => {
				await createNodePair(
					{ someString: 'potato' },
					{ someString: 'tomato' },
				);
				const { status, body } = await absorb(getInput());
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
				const { status, body } = await absorb(getInput());
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
				const { status, body } = await absorb(getInput());
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

				const { status, body } = await absorb(getInput());
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
							props: {
								code: childCode,
								...meta.default,
							},
						},
					);
				await neo4jTest('MainType', absorbedCode).notExists();
			});

			it('move incoming relationships', async () => {
				const [, absorbed] = await createNodePair();
				const parent = await createNode('ParentType', parentCode);
				await connectNodes(parent, 'IS_PARENT_OF', absorbed);

				const { status, body } = await absorb(getInput());
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
							props: {
								code: parentCode,
								...meta.default,
							},
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

				const { status, body } = await absorb(getInput());
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
							props: {
								code: childCode,
								...meta.default,
							},
						},
					);

				await neo4jTest('MainType', absorbedCode).notExists();
			});

			it('discard any newly reflexive relationships', async () => {
				const nodes = await createNodePair(
					{ code: mainCode },
					{ code: absorbedCode },
				);
				const [main, absorbed] = nodes;
				await connectNodes(main, 'HAS_YOUNGER_SIBLING', absorbed);
				const { status, body } = await absorb(getInput());
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

				const { status, body } = await absorb(getInput());
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
							props: {
								code: `${namespace}-child1`,
								...meta.default,
							},
						},
					);

				await neo4jTest('MainType', absorbedCode).notExists();
			});
		});

		describe('rich relationship information', () => {
			it('returns record with rich relationship information if richRelationships query is true', async () => {
				const [, absorbed] = await createNodePair();
				const child = await createNode('ChildType', childCode);
				const parent = await createNode('ParentType', parentCode);
				await connectNodes(absorbed, 'HAS_CHILD', child);
				await connectNodes(parent, 'IS_PARENT_OF', absorbed);

				const { status, body } = await absorb({
					...getInput(),
					query: { richRelationships: true },
				});

				expect(status).toBe(200);

				body.children.forEach(relationship =>
					expect(relationship).toMatchObject({
						code: childCode,
						...meta.default,
					}),
				);
				body.parents.forEach(relationship =>
					expect(relationship).toMatchObject({
						code: parentCode,
						...meta.default,
					}),
				);
			});
		});
	});
});

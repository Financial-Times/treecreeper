const { absorbHandler } = require('../absorb');

const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');

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
		documentStore.merge = jest.fn(async () => ({}));
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	const absorb = absorbHandler({ documentStore });
	const getInput = override =>
		override || {
			type: 'MainType',
			code: mainCode,
			otherCode: absorbedCode,
		};

	const createNodePair = (mainBody, absorbedBody) => {
		const nodes = [
			[
				'MainType',
				Object.assign(
					{
						code: mainCode,
					},
					mainBody || {},
				),
			],
			[
				'MainType',
				Object.assign(
					{
						code: absorbedCode,
					},
					absorbedBody || {},
				),
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

		it('errors if no code to absorb supplied', async () => {
			await createNodePair();
			await expect(
				absorbHandler()(
					getInput({
						type: 'MainType',
						code: mainCode,
					}),
				),
			).rejects.toThrow({
				status: 400,
				message: 'Expected parameter(s): code',
			});
			await neo4jTest('MainType', mainCode).match({
				code: mainCode,
				someString: 'fake1',
			});
		});

		it('errors if destination code does not exist', async () => {
			await createNode('MainType', {
				code: absorbedCode,
				someString: 'fake1',
			});
			await expect(absorbHandler()(getInput())).rejects.toThrow({
				status: 404,
				message: `MainType record missing for \`${mainCode}\``,
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
			await expect(absorbHandler()(getInput())).rejects.toThrow({
				status: 404,
				message: `MainType record missing for \`${absorbedCode}\``,
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
					{ someString: 'potato' }, // source
					{ someString: 'tomato' }, // destination
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
							props: Object.assign(
								{ code: childCode },
								meta.default,
							),
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
				// (mainCode:youngerSiblings)->(absorbed:olderSiblings)
				await connectNodes(main, 'HAS_YOUNGER_SIBLING', absorbed);
				// (mainCode:youngerSiblings)->(mainCode:youngerSiblings)
				const { status, body } = await absorb(getInput());
				expect(status).toBe(200);
				expect(body).toMatchObject({
					youngerSiblings: [mainCode],
				});

				await neo4jTest('MainType', mainCode).hasRels(1);
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

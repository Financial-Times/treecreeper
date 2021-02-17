const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');

const { absorbHandler } = require('../absorb');

describe('rest POST (absorb)', () => {
	const namespace = 'api-rest-handlers-absorb';
	const mainCode = `${namespace}-main`;
	const absorbedCode = `${namespace}-absorbed`;
	const leafCode = `${namespace}-leaf`;
	const parentCode = `${namespace}-parent`;

	const {
		createNodes,
		createNode,
		connectNodes,
		meta,
		getMetaPayload,
	} = setupMocks(namespace);

	const documentStore = {};

	beforeEach(() => {
		documentStore.absorb = jest.fn(async () => ({}));
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	const absorb = absorbHandler({ documentStore });
	const getInput = (override, metadata = {}) =>
		override || {
			type: 'SimpleGraphBranch',
			code: mainCode,
			codeToAbsorb: absorbedCode,
			metadata,
		};

	const createNodePair = (mainBody, absorbedBody) => {
		const nodes = [
			[
				'SimpleGraphBranch',
				{
					code: mainCode,
					...(mainBody || {}),
				},
			],
			[
				'SimpleGraphBranch',
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
						type: 'SimpleGraphBranch',
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
						type: 'SimpleGraphBranch',
						code: mainCode,
					}),
				),
			).rejects.httpError({
				status: 400,
				message: /Invalid value.+codeToAbsorb/,
			});
			await neo4jTest('SimpleGraphBranch', mainCode).match({
				code: mainCode,
			});
		});

		it('errors if main code does not exist', async () => {
			await createNode('SimpleGraphBranch', {
				code: absorbedCode,
				stringProperty: 'fake1',
			});
			await expect(absorbHandler()(getInput())).rejects.httpError({
				status: 404,
				message: `MainType record missing for \`code\``,
			});
			await neo4jTest('SimpleGraphBranch', absorbedCode).match({
				code: absorbedCode,
				stringProperty: 'fake1',
			});
		});

		it('errors if code to absorb does not exist', async () => {
			await createNode('SimpleGraphBranch', {
				code: mainCode,
				stringProperty: 'fake2',
			});
			await expect(absorbHandler()(getInput())).rejects.httpError({
				status: 404,
				message: `MainType record missing for \`codeToAbsorb\``,
			});
			await neo4jTest('SimpleGraphBranch', mainCode).match({
				code: mainCode,
				stringProperty: 'fake2',
			});
		});
	});

	describe('successful application', () => {
		describe('properties', () => {
			it('merges unconnected nodes', async () => {
				await createNodePair();

				const { status } = await absorb(getInput());
				expect(status).toBe(200);

				await neo4jTest('SimpleGraphBranch', mainCode).exists();
				await neo4jTest('SimpleGraphBranch', absorbedCode).notExists();
			});

			it('sets correct metadata', async () => {
				await createNodePair();

				const { status, body } = await absorb(
					getInput(null, getMetaPayload()),
				);
				expect(status).toBe(200);
				expect(body).toMatchObject(meta.update);

				await neo4jTest('SimpleGraphBranch', mainCode).exists();
				await neo4jTest('SimpleGraphBranch', absorbedCode).notExists();
			});

			it('not modify existing properties of destination node', async () => {
				await createNodePair(
					{ stringProperty: 'potato' },
					{ stringProperty: 'tomato' },
				);
				const { status, body } = await absorb(getInput());
				expect(status).toBe(200);
				expect(body).toMatchObject({
					stringProperty: 'potato',
				});
				await neo4jTest('SimpleGraphBranch', mainCode).match({
					stringProperty: 'potato',
				});
			});

			it('add new properties to destination node', async () => {
				await createNodePair(undefined, { stringProperty: 'potato' });
				const { status, body } = await absorb(getInput());
				expect(status).toBe(200);
				expect(body).toMatchObject({
					stringProperty: 'potato',
				});
				await neo4jTest('SimpleGraphBranch', mainCode).match({
					stringProperty: 'potato',
				});
			});

			it("doesn't error when unrecognised properties exist", async () => {
				await createNodePair(undefined, { notInSchema: 'someVal' });
				const { status, body } = await absorb(getInput());
				expect(status).toBe(200);
				expect(body).not.toMatchObject({
					notInSchema: expect.any(String),
				});

				await neo4jTest('SimpleGraphBranch', mainCode).match({
					notInSchema: 'someVal',
				});
				await neo4jTest('SimpleGraphBranch', absorbedCode).notExists();
			});
		});

		describe('relationships', () => {
			it('move outgoing relationships', async () => {
				const [, absorbed] = await createNodePair();
				const leaf = await createNode('SimpleGraphLeaf', leafCode);
				await connectNodes(absorbed, 'HAS_LEAF', leaf);

				const { status, body } = await absorb(getInput());
				expect(status).toBe(200);
				expect(body).toMatchObject({
					leaves: [leafCode],
				});

				await neo4jTest('SimpleGraphBranch', mainCode)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_LEAF',
							direction: 'outgoing',
							props: meta.default,
						},
						{
							type: 'SimpleGraphLeaf',
							props: {
								code: leafCode,
								...meta.default,
							},
						},
					);
				await neo4jTest('SimpleGraphBranch', absorbedCode).notExists();
			});

			it('move incoming relationships', async () => {
				const [, absorbed] = await createNodePair();
				const parent = await createNode('SimpleGraphBranch', parentCode);
				await connectNodes(parent, 'HAS_CHILD', absorbed);

				const { status, body } = await absorb(getInput());
				expect(status).toBe(200);
				expect(body).toMatchObject({
					parents: [parentCode],
				});

				await neo4jTest('SimpleGraphBranch', mainCode)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_CHILD',
							direction: 'incoming',
							props: meta.default,
						},
						{
							type: 'SimpleGraphBranch',
							props: {
								code: parentCode,
								...meta.default,
							},
						},
					);
				await neo4jTest('SimpleGraphBranch', absorbedCode).notExists();
			});

			it('merges identical relationships', async () => {
				const [main, absorbed] = await createNodePair();
				const leaf = await createNode('SimpleGraphLeaf', leafCode);

				await connectNodes(
					[main, 'HAS_LEAF', leaf],
					[absorbed, 'HAS_LEAF', leaf],
				);

				const { status, body } = await absorb(getInput());
				expect(status).toBe(200);
				expect(body).toMatchObject({
					leaves: [leafCode],
				});

				await neo4jTest('SimpleGraphBranch', mainCode)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_LEAF',
							direction: 'outgoing',
							props: meta.default,
						},
						{
							type: 'SimpleGraphLeaf',
							props: {
								code: leafCode,
								...meta.default,
							},
						},
					);

				await neo4jTest('SimpleGraphBranch', absorbedCode).notExists();
			});

			it('discard any newly reflexive relationships', async () => {
				const nodes = await createNodePair(
					{ code: mainCode },
					{ code: absorbedCode },
				);
				const [main, absorbed] = nodes;
				await connectNodes(main, 'HAS_CHILD', absorbed);
				const { status, body } = await absorb(getInput());
				expect(status).toBe(200);
				expect(body).not.toMatchObject({
					children: expect.any(Array),
				});
				expect(body).not.toMatchObject({
					parent: expect.any(Array),
				});

				await neo4jTest('SimpleGraphBranch', mainCode).hasRels(0);
				await neo4jTest('SimpleGraphBranch', absorbedCode).notExists();
			});

			it('does not overwrite __-to-one relationships', async () => {
				const [main, absorbed] = await createNodePair();

				const [parent1, parent2] = await createNodes(
					['SimpleGraphBranch', `${namespace}-parent1`],
					['SimpleGraphBranch', `${namespace}-parent2`],
				);

				await connectNodes(
					[parent1, 'HAS_CHILD', main],
					[parent2, 'HAS_CHILD', absorbed],
				);

				const { status, body } = await absorb(getInput());
				expect(status).toBe(200);
				expect(body).toMatchObject({
					parent: `${namespace}-parent1`,
				});

				await neo4jTest('SimpleGraphBranch', mainCode)
					.hasRels(1)
					.hasRel(
						{
							type: 'HAS_CHILD',
							direction: 'incoming',
							props: meta.default,
						},
						{
							type: 'SimpleGraphBranch',
							props: {
								code: `${namespace}-parent1`,
								...meta.default,
							},
						},
					);

				await neo4jTest('SimpleGraphBranch', absorbedCode).notExists();
			});
		});

		describe('rich relationship information', () => {
			it('returns record with rich relationship information if richRelationships query is true', async () => {
				const [, absorbed] = await createNodePair();
				const leaf = await createNode('SimpleGraphLeaf', leafCode);
				const parent = await createNode('SimpleGraphBranch', parentCode);
				await connectNodes(absorbed, 'HAS_LEAF', leaf);
				await connectNodes(parent, 'HAS_CHILD', absorbed);

				const { status, body } = await absorb({
					...getInput(),
					query: { richRelationships: true },
				});

				expect(status).toBe(200);

				body.leaves.forEach(relationship =>
					expect(relationship).toMatchObject({
						code: leafCode,
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

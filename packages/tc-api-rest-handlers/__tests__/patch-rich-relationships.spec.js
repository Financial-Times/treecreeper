const { setupMocks, neo4jTest } = require('../../../test-helpers');

const { patchHandler } = require('../patch');

const patch = patchHandler();

describe('rest PATCH rich relationships', () => {
	const namespace = 'api-rest-handlers-patch-rich-relationships';
	const mainCode = `${namespace}-main`;
	const leafCode = `${namespace}-leaf`;
	const leafCode1 = `${namespace}-leaf-1`;
	const leafCode2 = `${namespace}-leaf-2`;
	const parentCode = `${namespace}-parent`;

	const {
		createNode,
		createNodes,
		stockMetadata,
		getMetaPayload,
		connectNodes,
	} = setupMocks(namespace);

	const typeAndCode = {
		type: 'SimpleGraphBranch',
		code: mainCode,
	};

	const basePayload = {
		...typeAndCode,
		metadata: getMetaPayload(),
		query: {
			upsert: true,
			relationshipAction: 'merge',
			richRelationships: true,
		},
	};

	describe('Editing properties on existing relationships', () => {
		it("update existing relationship's property", async () => {
			const [main, leaf] = await createNodes(
				['SimpleGraphBranch', mainCode],
				['SimpleGraphLeaf', leafCode],
			);
			await connectNodes(main, 'HAD_LEAF', leaf, {
				stringProperty: 'some string',
			});
			const { body, status } = await patch({
				...basePayload,
				body: {
					fallenLeaves: [
						{ code: leafCode, stringProperty: 'new some string' },
					],
				},
				query: { relationshipAction: 'merge', richRelationships: true },
			});

			expect(status).toBe(200);
			expect(body.fallenLeaves[0]).toMatchObject({
				stringProperty: 'new some string',
			});

			await neo4jTest('SimpleGraphBranch', mainCode)
				.match(stockMetadata.default)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAD_LEAF',
						direction: 'outgoing',
						props: {
							stringProperty: 'new some string',
							...stockMetadata.update,
						},
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

		it('deletes a property as an update', async () => {
			const [main, leaf] = await createNodes(
				['SimpleGraphBranch', mainCode],
				['SimpleGraphLeaf', leafCode],
			);
			await connectNodes(main, 'HAD_LEAF', leaf, {
				stringProperty: 'some string',
			});
			const { body, status } = await patch({
				...basePayload,
				body: {
					fallenLeaves: [{ code: leafCode, stringProperty: null }],
				},
				query: { relationshipAction: 'merge', richRelationships: true },
			});

			expect(status).toBe(200);
			expect(body.fallenLeaves[0]).not.toMatchObject({
				stringProperty: 'some string',
			});
			await neo4jTest('SimpleGraphBranch', mainCode)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAD_LEAF',
						direction: 'outgoing',
						props: stockMetadata.update,
						notProps: ['stringProperty'],
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

		it('throws 400 if attempting to write relationship property not in schema', async () => {
			const [main, leaf] = await createNodes(
				['SimpleGraphBranch', mainCode],
				['SimpleGraphLeaf', leafCode],
			);
			await connectNodes(main, 'HAD_LEAF', leaf, {
				stringProperty: 'some string',
			});

			await expect(
				patch({
					...basePayload,
					body: {
						fallenLeaves: [
							{ code: leafCode, notInSchema: 'a string' },
						],
					},
					query: {
						relationshipAction: 'merge',
						richRelationships: true,
					},
				}),
			).rejects.httpError({
				status: 400,
				message: 'Invalid property `notInSchema` on type `FallenLeaf`.',
			});
			await neo4jTest('SimpleGraphBranch', mainCode)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAD_LEAF',
						direction: 'outgoing',
						props: {
							stringProperty: 'some string',
							...stockMetadata.default,
						},
						notProps: ['notInSchema'],
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

	describe('rich relationship creation', () => {
		it('returns record with rich relationship information if richRelationships query is true', async () => {
			await createNode('SimpleGraphBranch', { code: mainCode });
			await createNodes(
				['SimpleGraphLeaf', leafCode],
				['SimpleGraphBranch', parentCode],
			);

			const { body, status } = await patch({
				...basePayload,
				body: { leaves: leafCode, parent: parentCode },
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				leaves: [{ code: leafCode, ...stockMetadata.create }],
				parent: { code: parentCode, ...stockMetadata.create },
			});
		});
		it('patches record with rich relationship to another record', async () => {
			await createNode('SimpleGraphLeaf', { code: leafCode1 });
			const relationshipDef = {
				stringProperty: 'some string',
				booleanProperty: true,
			};
			const { status, body } = await patch({
				type: 'SimpleGraphLeaf',
				code: leafCode1,
				body: {
					formerBranch: { code: mainCode, ...relationshipDef },
				},
				query: {
					upsert: true,
					richRelationships: true,
					relationshipAction: 'merge',
				},
				metadata: getMetaPayload(),
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				formerBranch: {
					code: mainCode,
					...relationshipDef,
					...stockMetadata.create,
				},
			});

			await neo4jTest('SimpleGraphLeaf', leafCode1)
				.match(stockMetadata.update)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAD_LEAF',
						direction: 'incoming',
						props: {
							...relationshipDef,
							...stockMetadata.create,
						},
					},
					{
						type: 'SimpleGraphBranch',
						props: {
							code: mainCode,
							...stockMetadata.create,
						},
					},
				);
		});

		it('patches record with rich relationships to other records', async () => {
			await createNode('SimpleGraphBranch', { code: mainCode });
			const relationshipDef1 = {
				stringProperty: 'some string1',
				booleanProperty: true,
			};
			const relationshipDef2 = {
				stringProperty: 'some string2',
				booleanProperty: false,
			};
			const { status, body } = await patch({
				...basePayload,
				body: {
					fallenLeaves: [
						{ code: leafCode1, ...relationshipDef1 },
						{ code: leafCode2, ...relationshipDef2 },
					],
				},
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				fallenLeaves: [
					{
						code: leafCode1,
						...relationshipDef1,
						...stockMetadata.create,
					},
					{
						code: leafCode2,
						...relationshipDef2,
						...stockMetadata.create,
					},
				],
			});

			await neo4jTest('SimpleGraphBranch', mainCode)
				.match(stockMetadata.update)
				.hasRels(2)
				.hasRel(
					{
						type: 'HAD_LEAF',
						direction: 'outgoing',
						props: {
							...relationshipDef1,
							...stockMetadata.create,
						},
					},
					{
						type: 'SimpleGraphLeaf',
						props: { code: leafCode1, ...stockMetadata.create },
					},
				)
				.hasRel(
					{
						type: 'HAD_LEAF',
						direction: 'outgoing',
						props: {
							...relationshipDef2,
							...stockMetadata.create,
						},
					},
					{
						type: 'SimpleGraphLeaf',
						props: { code: leafCode2, ...stockMetadata.create },
					},
				);
		});

		it('patches record with relationship which has a multiple choice property', async () => {
			await createNode('SimpleGraphBranch', { code: mainCode });
			const relationshipDef = {
				multipleChoiceEnumProperty: ['First', 'Second'],
			};
			const { status, body } = await patch({
				...basePayload,
				body: {
					fallenLeaves: [{ code: leafCode1, ...relationshipDef }],
				},
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				fallenLeaves: [{ code: leafCode1, ...relationshipDef }],
			});

			await neo4jTest('SimpleGraphBranch', mainCode)
				.match(stockMetadata.update)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAD_LEAF',
						direction: 'outgoing',
						props: {
							...relationshipDef,
							...stockMetadata.create,
						},
					},
					{
						type: 'SimpleGraphLeaf',
						props: { code: leafCode1, ...stockMetadata.create },
					},
				);
		});

		it('throws 400 if attempting to write relationship property not in schema', async () => {
			await createNode('SimpleGraphBranch', { code: mainCode });
			await expect(
				patch({
					...basePayload,
					body: {
						fallenLeaves: [{ code: leafCode1, notInSchema: 'no' }],
					},
				}),
			).rejects.httpError({
				status: 400,
				message: 'Invalid property `notInSchema` on type `FallenLeaf`.',
			});

			await neo4jTest('SimpleGraphLeaf', leafCode1).notExists();
		});

		it('regression: can patch node related to nodes with strange codes', async () => {
			const oddCode = `${namespace}:thing/odd`;
			await createNode('SimpleGraphBranch', { code: mainCode });
			const { status, body } = await patch({
				...basePayload,
				body: {
					richRelationshipToOddCodedType: {
						code: oddCode,
						oddString: 'blah',
					},
				},
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				richRelationshipToOddCodedType: [
					{
						code: oddCode,
						oddString: 'blah',
					},
				],
			});

			await neo4jTest('SimpleGraphBranch', mainCode)
				.hasRels(1)
				.hasRel(
					{
						type: 'HAS_ODD_CODED_THING',
						direction: 'outgoing',
						props: { oddString: 'blah', ...stockMetadata.create },
					},
					{
						type: 'OddCodeType',
						props: {
							code: oddCode,
							...stockMetadata.create,
						},
					},
				);
		});
	});
});

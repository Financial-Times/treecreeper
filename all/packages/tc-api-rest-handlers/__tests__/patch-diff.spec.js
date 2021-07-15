const { setupMocks } = require('../../../test-helpers');
const { spyDbQuery } = require('../../../test-helpers/db-spies');

const { patchHandler } = require('../patch');

const patch = patchHandler();

describe('rest PATCH diff', () => {
	const namespace = 'api-rest-handlers-patch-diff';
	const mainCode = `${namespace}-main`;
	const leafCode = `${namespace}-leaf`;

	const { createNodes, createNode, connectNodes } = setupMocks(namespace);
	describe('properties', () => {
		it("doesn't write if no real property changes detected", async () => {
			await createNode('PropertiesTest', {
				code: mainCode,
				firstStringProperty: 'some string',
			});
			const dbQuerySpy = spyDbQuery();
			const { status } = await patch({
				type: 'PropertiesTest',
				code: mainCode,
				body: { firstStringProperty: 'some string' },
			});
			expect(status).toBe(200);
			expect(dbQuerySpy).not.toHaveBeenCalledWith(
				expect.stringMatching(/MERGE|CREATE/),
				expect.any(Object),
			);
		});

		it("doesn't write if no real array property changes detected", async () => {
			await createNode('PropertiesTest', {
				code: mainCode,
				multipleChoiceEnumProperty: ['First', 'Second'],
			});
			const dbQuerySpy = spyDbQuery();
			const { status } = await patch({
				type: 'PropertiesTest',
				code: mainCode,
				// firstStringPropertyList: ['two', 'one'],
				body: { multipleChoiceEnumProperty: ['Second', 'First'] },
			});
			expect(status).toBe(200);
			expect(dbQuerySpy).not.toHaveBeenCalledWith(
				expect.stringMatching(/MERGE|CREATE/),
				expect.any(Object),
			);
		});

		it.skip("doesn't write if no real date changes detected", () => {});
		it.skip("doesn't write if no real datetime changes detected", () => {});
		it.skip("doesn't write if no real time changes detected", () => {});

		it('detects deleted property as a change', async () => {
			await createNode('PropertiesTest', {
				code: mainCode,
				firstStringProperty: 'firstStringProperty',
			});
			const dbQuerySpy = spyDbQuery();
			const { status } = await patch({
				type: 'PropertiesTest',
				code: mainCode,
				body: { firstStringProperty: null },
			});
			expect(status).toBe(200);
			expect(dbQuerySpy).toHaveBeenCalledWith(
				expect.stringMatching(/MERGE|CREATE/),
				expect.any(Object),
			);
		});
		it('writes if property but no relationship changes detected', async () => {
			const [main, leaf] = await createNodes(
				['SimpleGraphBranch', mainCode],
				['SimpleGraphLeaf', leafCode],
			);
			await connectNodes(main, 'HAS_LEAF', leaf);
			const dbQuerySpy = spyDbQuery();
			const { status } = await patch({
				type: 'SimpleGraphBranch',
				code: mainCode,
				body: { stringProperty: 'new-name', leaves: [leafCode] },
				query: { relationshipAction: 'merge' },
			});
			expect(status).toBe(200);
			expect(dbQuerySpy).toHaveBeenCalledWith(
				expect.stringMatching(/MERGE|CREATE/),
				expect.any(Object),
			);
		});
	});

	describe('relationships', () => {
		it("doesn't write if no real relationship changes detected in REPLACE mode", async () => {
			const [main, leaf] = await createNodes(
				['SimpleGraphBranch', mainCode],
				['SimpleGraphLeaf', leafCode],
			);
			await connectNodes(main, 'HAS_LEAF', leaf);
			const dbQuerySpy = spyDbQuery();
			const { status } = await patch({
				type: 'SimpleGraphBranch',
				code: mainCode,
				body: { leaves: [leafCode] },
				query: { relationshipAction: 'replace' },
			});
			expect(status).toBe(200);
			expect(dbQuerySpy).not.toHaveBeenCalledWith(
				expect.stringMatching(/MERGE|CREATE/),
				expect.any(Object),
			);
		});

		it("doesn't write if no real relationship changes detected in MERGE mode", async () => {
			const [main, leaf] = await createNodes(
				['SimpleGraphBranch', mainCode],
				['SimpleGraphLeaf', leafCode],
			);
			await connectNodes(main, 'HAS_LEAF', leaf);
			const dbQuerySpy = spyDbQuery();

			const { status } = await patch({
				type: 'SimpleGraphBranch',
				code: mainCode,
				body: { leaves: [leafCode] },
				query: { relationshipAction: 'merge' },
			});
			expect(status).toBe(200);
			expect(dbQuerySpy).not.toHaveBeenCalledWith(
				expect.stringMatching(/MERGE|CREATE/),
				expect.any(Object),
			);
		});

		it('writes if relationship but no property changes detected', async () => {
			const [main, leaf] = await createNodes(
				[
					'SimpleGraphBranch',
					{
						code: mainCode,
						stringProperty: 'stringProperty',
					},
				],
				['SimpleGraphLeaf', `${leafCode}-1`],
				['SimpleGraphLeaf', `${leafCode}-2`],
			);
			await connectNodes(main, 'HAS_LEAF', leaf);
			const dbQuerySpy = spyDbQuery();
			const { status } = await patch({
				type: 'SimpleGraphBranch',
				code: mainCode,
				body: {
					stringProperty: 'stringProperty',
					leaves: [`${leafCode}-2`],
				},
				query: { relationshipAction: 'merge' },
			});
			expect(status).toBe(200);
			expect(dbQuerySpy).toHaveBeenCalledWith(
				expect.stringMatching(/MERGE|CREATE/),
				expect.any(Object),
			);
		});
		describe('rich-relationships', () => {
			it("doesn't write if no real relationship property changes detected", async () => {
				const [main, leaf] = await createNodes(
					['SimpleGraphBranch', mainCode],
					['SimpleGraphLeaf', leafCode],
				);
				await connectNodes(main, 'HAD_LEAF', leaf, {
					stringProperty: 'some string',
				});
				const dbQuerySpy = spyDbQuery();
				const { status } = await patch({
					type: 'SimpleGraphBranch',
					code: mainCode,
					body: {
						fallenLeaves: [
							{ code: leafCode, stringProperty: 'some string' },
						],
					},
					query: { relationshipAction: 'merge' },
				});
				expect(status).toBe(200);
				expect(dbQuerySpy).not.toHaveBeenCalledWith(
					expect.stringMatching(/MERGE|CREATE/),
					expect.any(Object),
				);
			});

			it("doesn't write if no real relationship property changes detected (mixed relationships with and without prop)", async () => {
				const [main, leaf1, leaf2] = await createNodes(
					['SimpleGraphBranch', mainCode],
					['SimpleGraphLeaf', `${leafCode}-1`],
					['SimpleGraphLeaf', `${leafCode}-2`],
				);
				await connectNodes(main, 'HAD_LEAF', leaf1, {
					stringProperty: 'some string',
				});
				await connectNodes(main, 'HAD_LEAF', leaf2);
				const dbQuerySpy = spyDbQuery();
				const { status } = await patch({
					type: 'SimpleGraphBranch',
					code: mainCode,
					body: {
						fallenLeaves: [
							{
								code: `${leafCode}-1`,
								stringProperty: 'some string',
							},
							`${leafCode}-2`,
						],
					},
					query: { relationshipAction: 'merge' },
				});
				expect(status).toBe(200);
				expect(dbQuerySpy).not.toHaveBeenCalledWith(
					expect.stringMatching(/MERGE|CREATE/),
					expect.any(Object),
				);
			});

			it('writes if one of the relationship properties changes detected', async () => {
				const [main, leaf] = await createNodes(
					['SimpleGraphBranch', mainCode],
					['SimpleGraphLeaf', leafCode],
				);
				await connectNodes(main, 'HAD_LEAF', leaf, {
					stringProperty: 'some string',
					booleanProperty: true,
				});
				const dbQuerySpy = spyDbQuery();
				const { status } = await patch({
					type: 'SimpleGraphBranch',
					code: mainCode,
					body: {
						fallenLeaves: [
							{
								code: leafCode,
								stringProperty: 'some string',
								booleanProperty: false,
							},
						],
					},
					query: { relationshipAction: 'merge' },
				});
				expect(status).toBe(200);
				expect(dbQuerySpy).toHaveBeenCalledWith(
					expect.stringMatching(/MERGE|CREATE/),
					expect.any(Object),
				);
			});

			it('detects deleted relationship property as a change', async () => {
				const [main, leaf] = await createNodes(
					['SimpleGraphBranch', mainCode],
					['SimpleGraphLeaf', leafCode],
				);
				await connectNodes(main, 'HAD_LEAF', leaf, {
					stringProperty: 'some string',
				});
				const dbQuerySpy = spyDbQuery();
				const { status } = await patch({
					type: 'SimpleGraphBranch',
					code: mainCode,
					body: {
						fallenLeaves: [
							{ code: leafCode, stringProperty: null },
						],
					},
					query: { relationshipAction: 'merge' },
				});
				expect(status).toBe(200);
				expect(dbQuerySpy).toHaveBeenCalledWith(
					expect.stringMatching(/MERGE|CREATE/),
					expect.any(Object),
				);
			});
		});

		describe('patching with fewer relationships', () => {
			it('treats fewer relationships as a delete when replacing relationships', async () => {
				const [main, leaf1, leaf2] = await createNodes(
					['SimpleGraphBranch', mainCode],
					['SimpleGraphLeaf', `${leafCode}-1`],
					['SimpleGraphLeaf', `${leafCode}-2`],
				);
				await connectNodes(main, 'HAS_LEAF', leaf1);
				await connectNodes(main, 'HAS_LEAF', leaf2);
				const dbQuerySpy = spyDbQuery();
				const { status } = await patch({
					type: 'SimpleGraphBranch',
					code: mainCode,
					body: { leaves: [`${leafCode}-1`] },
					query: { relationshipAction: 'replace' },
				});
				expect(status).toBe(200);
				expect(dbQuerySpy).toHaveBeenCalledWith(
					expect.stringMatching(/MERGE|CREATE/),
					expect.any(Object),
				);
			});

			it('treats fewer relationships as no change when merging relationships', async () => {
				const [main, leaf1, leaf2] = await createNodes(
					['SimpleGraphBranch', mainCode],
					['SimpleGraphLeaf', `${leafCode}-1`],
					['SimpleGraphLeaf', `${leafCode}-2`],
				);
				await connectNodes(main, 'HAS_LEAF', leaf1);
				await connectNodes(main, 'HAS_LEAF', leaf2);
				const dbQuerySpy = spyDbQuery();
				const { status } = await patch({
					type: 'SimpleGraphBranch',
					code: mainCode,
					body: { leaves: [`${leafCode}-1`] },
					query: { relationshipAction: 'merge' },
				});
				expect(status).toBe(200);
				expect(dbQuerySpy).not.toHaveBeenCalledWith(
					expect.stringMatching(/MERGE|CREATE/),
					expect.any(Object),
				);
			});
		});
	});
});

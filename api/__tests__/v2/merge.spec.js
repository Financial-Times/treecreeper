const createApp = require('../../server/create-app.js');

let app;
const {
	setupMocks,
	verifyExists,
	verifyNotExists,
	testNode,
	stubDbUnavailable,
} = require('../helpers');

describe('merge', () => {
	const sandbox = {};
	const namespace = 'v2-merge';

	const mainCode1 = `${namespace}-main1`;
	const mainCode2 = `${namespace}-main2`;
	const childCode = `${namespace}-child`;
	const parentCode = `${namespace}-parent`;

	setupMocks(sandbox, { namespace });

	const testMergeRequest = (payload, ...expectations) => {
		expectations[0] = expectations[0] || 200;
		if (expectations[1] && expectations[1].children) {
			expectations[1].deprecatedChildren = expectations[1].children;
		}
		return sandbox
			.request(app)
			.post(
				`/v2/node/${payload.type}/${payload.destinationCode}/absorb/${payload.sourceCode}`,
			)
			.namespacedAuth()
			.expect(...expectations);
	};
	beforeAll(async () => {
		app = await createApp();
	});
	describe('error handling', () => {
		beforeEach(() =>
			sandbox.createNodes(
				['MainType', { code: mainCode1, someDocument: 'fake1' }],
				['MainType', { code: mainCode2, someDocument: 'fake2' }],
			),
		);

		it('responds with 500 if neo4j query fails', async () => {
			stubDbUnavailable(sandbox);
			await testMergeRequest(
				{
					type: 'MainType',
					sourceCode: mainCode1,
					destinationCode: mainCode2,
				},
				500,
			);
		});

		it('errors if type invalid', async () => {
			await testMergeRequest(
				{
					type: 'InvalidType',
					sourceCode: mainCode1,
					destinationCode: mainCode2,
				},
				400,
				/Invalid type/,
			);
			await Promise.all([
				verifyExists('MainType', mainCode1),
				verifyExists('MainType', mainCode2),
			]);
		});

		it('errors if source code does not exist', async () => {
			await testMergeRequest(
				{
					type: 'MainType',
					sourceCode: 'not-exist',
					destinationCode: mainCode2,
				},
				404,
				/record missing/,
			);
			await Promise.all([
				verifyExists('MainType', mainCode1),
				verifyExists('MainType', mainCode2),
			]);
		});
		it('errors if destination code does not exist', async () => {
			await testMergeRequest(
				{
					type: 'MainType',
					sourceCode: mainCode1,
					destinationCode: 'not-exist',
				},
				404,
				/record missing/,
			);
			await Promise.all([
				verifyExists('MainType', mainCode1),
				verifyExists('MainType', mainCode2),
			]);
		});
	});
	describe('successful application', () => {
		describe('properties', () => {
			it('merges unconnected nodes', async () => {
				await sandbox.createNodes(
					['MainType', mainCode1],
					['MainType', mainCode2],
				);

				await testMergeRequest({
					type: 'MainType',
					sourceCode: mainCode1,
					destinationCode: mainCode2,
				});
				await Promise.all([
					verifyNotExists('MainType', mainCode1),
					verifyExists('MainType', mainCode2),
				]);
			});

			it('merges ordinary properties', async () => {
				await sandbox.createNodes(
					[
						'MainType',
						{
							code: mainCode1,
							someString: 'Fake String',
							anotherString: 'Another Fake String',
						},
					],
					[
						'MainType',
						{
							code: mainCode2,
							anotherString: 'A Third Fake String',
						},
					],
				);
				await testMergeRequest(
					{
						type: 'MainType',
						sourceCode: mainCode1,
						destinationCode: mainCode2,
					},
					200,
					sandbox.withUpdateMeta({
						code: mainCode2,
						someString: 'Fake String',
						anotherString: 'A Third Fake String',
					}),
				);
			});

			it("doesn't error when unrecognised properties exist", async () => {
				await sandbox.createNodes(
					['MainType', { code: mainCode1, notInSchema: 'someVal' }],
					['MainType', mainCode2],
				);

				await testMergeRequest({
					type: 'MainType',
					sourceCode: mainCode1,
					destinationCode: mainCode2,
				});
				await Promise.all([
					verifyNotExists('MainType', mainCode1),
					verifyExists('MainType', mainCode2),
				]);

				await testNode(
					'MainType',
					mainCode2,
					sandbox.withUpdateMeta({
						code: mainCode2,
						notInSchema: 'someVal',
					}),
				);
			});

			it('not modify existing properties of destination node', async () => {
				await sandbox.createNodes(
					['MainType', { code: mainCode1, someString: 'potato' }],
					['MainType', { code: mainCode2, someString: 'tomato' }],
				);
				await testMergeRequest({
					type: 'MainType',
					sourceCode: mainCode1,
					destinationCode: mainCode2,
				});
				await testNode(
					'MainType',
					mainCode2,
					sandbox.withMeta({
						code: mainCode2,
						someString: 'tomato',
					}),
				);
			});

			it('add new properties to destination node', async () => {
				await sandbox.createNodes(
					['MainType', { code: mainCode1, someString: 'potato' }],
					['MainType', { code: mainCode2 }],
				);
				await testMergeRequest({
					type: 'MainType',
					sourceCode: mainCode1,
					destinationCode: mainCode2,
				});
				await testNode(
					'MainType',
					mainCode2,
					sandbox.withMeta({
						code: mainCode2,
						someString: 'potato',
					}),
				);
			});
		});

		describe('relationships', () => {
			it('move outgoing relationships', async () => {
				const [main1, , child] = await sandbox.createNodes(
					['MainType', mainCode1],
					['MainType', mainCode2],
					['ChildType', childCode],
				);

				await sandbox.connectNodes(main1, 'HAS_CHILD', child);

				await testMergeRequest({
					type: 'MainType',
					sourceCode: mainCode1,
					destinationCode: mainCode2,
				});
				await verifyNotExists('MainType', mainCode1);

				await testNode(
					'MainType',
					mainCode2,
					sandbox.withMeta({
						code: mainCode2,
					}),
					[
						{
							type: 'HAS_CHILD',
							direction: 'outgoing',
							props: sandbox.withMeta({}),
						},
						{
							type: 'ChildType',
							props: sandbox.withMeta({ code: childCode }),
						},
					],
				);
			});

			it('move incoming relationships', async () => {
				const [main1, , parent] = await sandbox.createNodes(
					['MainType', mainCode1],
					['MainType', mainCode2],
					['ParentType', parentCode],
				);

				await sandbox.connectNodes(parent, 'IS_PARENT_OF', main1);

				await testMergeRequest({
					type: 'MainType',
					sourceCode: mainCode1,
					destinationCode: mainCode2,
				});
				await verifyNotExists('MainType', mainCode1);

				await testNode(
					'MainType',
					mainCode2,
					sandbox.withMeta({
						code: mainCode2,
					}),
					[
						{
							type: 'IS_PARENT_OF',
							direction: 'incoming',
							props: sandbox.withMeta({}),
						},
						{
							type: 'ParentType',
							props: sandbox.withMeta({ code: parentCode }),
						},
					],
				);
			});

			it('merges identical relationships', async () => {
				const [main1, main2, child] = await sandbox.createNodes(
					['MainType', mainCode1],
					['MainType', mainCode2],
					['ChildType', childCode],
				);

				await sandbox.connectNodes(
					[main1, 'HAS_CHILD', child],
					[main2, 'HAS_CHILD', child],
				);

				await testMergeRequest({
					type: 'MainType',
					sourceCode: mainCode1,
					destinationCode: mainCode2,
				});
				await verifyNotExists('MainType', mainCode1);

				await testNode(
					'MainType',
					mainCode2,
					sandbox.withMeta({
						code: mainCode2,
					}),
					[
						{
							type: 'HAS_CHILD',
							direction: 'outgoing',
							props: sandbox.withMeta({}),
						},
						{
							type: 'ChildType',
							props: sandbox.withMeta({ code: childCode }),
						},
					],
				);
			});

			it('discard any newly reflexive relationships', async () => {
				const [main1, main2] = await sandbox.createNodes(
					['MainType', mainCode1],
					['MainType', mainCode2],
				);

				await sandbox.connectNodes(main1, 'HAS_YOUNGER_SIBLING', main2);
				await testMergeRequest({
					type: 'MainType',
					sourceCode: mainCode1,
					destinationCode: mainCode2,
				});
				await verifyNotExists('MainType', mainCode1);

				await testNode(
					'MainType',
					mainCode2,
					sandbox.withMeta({
						code: mainCode2,
					}),
				);
			});

			it('does not overwrite __-to-one relationships', async () => {
				const [
					Main1,
					Main2,
					child1,
					child2,
				] = await sandbox.createNodes(
					['MainType', `${namespace}-main1`],
					['MainType', `${namespace}-main2`],
					['ChildType', `${namespace}-child1`],
					['ChildType', `${namespace}-child2`],
				);

				await sandbox.connectNodes(
					[Main1, 'HAS_FAVOURITE_CHILD', child1],
					[Main2, 'HAS_FAVOURITE_CHILD', child2],
				);

				await testMergeRequest({
					type: 'MainType',
					sourceCode: `${namespace}-main1`,
					destinationCode: `${namespace}-main2`,
				});
				await verifyNotExists('MainType', mainCode1);

				await testNode(
					'MainType',
					`${namespace}-main2`,
					sandbox.withMeta({
						code: `${namespace}-main2`,
					}),
					[
						{
							type: 'HAS_FAVOURITE_CHILD',
							direction: 'outgoing',
							props: sandbox.withMeta({}),
						},
						{
							type: 'ChildType',
							props: sandbox.withMeta({
								code: `${namespace}-child2`,
							}),
						},
					],
				);
			});
		});
	});
});

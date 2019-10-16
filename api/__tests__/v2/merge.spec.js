const app = require('../../server/app.js');
const {
	setupMocks,
	verifyExists,
	verifyNotExists,
	testNode,
	stubDbUnavailable,
	stubS3Unavailable,
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
		return sandbox
			.request(app)
			.post('/v2/merge')
			.namespacedAuth()
			.send(payload)
			.expect(...expectations);
	};

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
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});

		it('responds with 500 if s3 query fails', async () => {
			stubS3Unavailable(sandbox);
			await testMergeRequest(
				{
					type: 'MainType',
					sourceCode: mainCode1,
					destinationCode: mainCode2,
				},
				500,
			);
			await Promise.all([
				verifyExists('MainType', mainCode1),
				verifyExists('MainType', mainCode2),
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});

		it('errors if no type supplied', async () => {
			await testMergeRequest(
				{
					sourceCode: mainCode1,
					destinationCode: mainCode2,
				},
				400,
				/No type/,
			);

			await Promise.all([
				verifyExists('MainType', mainCode1),
				verifyExists('MainType', mainCode2),
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});

		it('errors if no source code supplied', async () => {
			await testMergeRequest(
				{
					type: 'MainType',
					destinationCode: mainCode2,
				},
				400,
				/No sourceCode/,
			);
			await Promise.all([
				verifyExists('MainType', mainCode1),
				verifyExists('MainType', mainCode2),
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});
		it('errors if no destination code supplied', async () => {
			await testMergeRequest(
				{
					type: 'MainType',
					sourceCode: mainCode1,
				},
				400,
				/No destinationCode/,
			);
			await Promise.all([
				verifyExists('MainType', mainCode1),
				verifyExists('MainType', mainCode2),
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
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
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
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
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
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
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
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
				sandbox.expectKinesisEvents(['DELETE', mainCode1, 'MainType']);
			});

			it('merges ordinary properties', async () => {
				sandbox.setS3Responses({ merge: {} });
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
				sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
			});

			it('merges document properties', async () => {
				await sandbox.createNodes(
					[
						'MainType',

						{
							code: mainCode1,
							someDocument: 'Fake Document',
							anotherDocument: 'Another Fake Document',
						},
					],
					[
						'MainType',
						{
							code: mainCode2,
							anotherDocument: 'A Third Fake Document',
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
						someDocument: 'Fake Document',
						anotherDocument: 'A Third Fake Document',
					}),
				);
				sandbox.expectS3Actions({
					action: 'merge',
					nodeType: 'MainType',
					sourceCode: mainCode1,
					destinationCode: mainCode2,
				});
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
				sandbox.expectKinesisEvents(['DELETE', mainCode1, 'MainType']);
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

				sandbox.expectKinesisEvents(['DELETE', mainCode1, 'MainType']);
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

				sandbox.expectKinesisEvents(
					['DELETE', mainCode1, 'MainType'],
					['UPDATE', mainCode2, 'MainType', ['someString']],
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

				sandbox.expectKinesisEvents(
					['DELETE', mainCode1, 'MainType'],
					['UPDATE', mainCode2, 'MainType', ['children']],
					['UPDATE', childCode, 'ChildType', ['isChildOf']],
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

				sandbox.expectKinesisEvents(
					['DELETE', mainCode1, 'MainType'],
					['UPDATE', mainCode2, 'MainType', ['parents']],
					['UPDATE', parentCode, 'ParentType', ['isParentOf']],
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
				sandbox.expectKinesisEvents(['DELETE', mainCode1, 'MainType']);
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
				sandbox.expectKinesisEvents(
					['DELETE', mainCode1, 'MainType'],
					['UPDATE', mainCode2, 'MainType', ['olderSiblings']],
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
				sandbox.expectKinesisEvents(
					['DELETE', `${namespace}-main1`, 'MainType'],
					[
						'UPDATE',
						`${namespace}-child1`,
						'ChildType',
						['isFavouriteChildOf'],
					],
				);
			});
		});
	});
});

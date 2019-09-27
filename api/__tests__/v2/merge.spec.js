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

	const rootTypeCode1 = `${namespace}-root-1`;
	const rootTypeCode2 = `${namespace}-root-2`;
	const childTypeCode = `${namespace}-child-type`;
	const parentTypeCode = `${namespace}-parent-type`;

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
				['RootType', rootTypeCode1, { someDocument: 'fake1' }],
				['RootType', rootTypeCode2, { someDocument: 'fake2' }],
			),
		);

		it('responds with 500 if neo4j query fails', async () => {
			stubDbUnavailable(sandbox);
			await testMergeRequest(
				{
					type: 'RootType',
					sourceCode: rootTypeCode1,
					destinationCode: rootTypeCode2,
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
					type: 'RootType',
					sourceCode: rootTypeCode1,
					destinationCode: rootTypeCode2,
				},
				500,
			);
			await Promise.all([
				verifyExists('RootType', rootTypeCode1),
				verifyExists('RootType', rootTypeCode2),
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});

		it('errors if no type supplied', async () => {
			await testMergeRequest(
				{
					sourceCode: rootTypeCode1,
					destinationCode: rootTypeCode2,
				},
				400,
				/No type/,
			);

			await Promise.all([
				verifyExists('RootType', rootTypeCode1),
				verifyExists('RootType', rootTypeCode2),
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});

		it('errors if no source code supplied', async () => {
			await testMergeRequest(
				{
					type: 'RootType',
					destinationCode: rootTypeCode2,
				},
				400,
				/No sourceCode/,
			);
			await Promise.all([
				verifyExists('RootType', rootTypeCode1),
				verifyExists('RootType', rootTypeCode2),
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});
		it('errors if no destination code supplied', async () => {
			await testMergeRequest(
				{
					type: 'RootType',
					sourceCode: rootTypeCode1,
				},
				400,
				/No destinationCode/,
			);
			await Promise.all([
				verifyExists('RootType', rootTypeCode1),
				verifyExists('RootType', rootTypeCode2),
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});
		it('errors if type invalid', async () => {
			await testMergeRequest(
				{
					type: 'NotTeam',
					sourceCode: rootTypeCode1,
					destinationCode: rootTypeCode2,
				},
				400,
				/Invalid type/,
			);
			await Promise.all([
				verifyExists('RootType', rootTypeCode1),
				verifyExists('RootType', rootTypeCode2),
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});

		it('errors if source code does not exist', async () => {
			await testMergeRequest(
				{
					type: 'RootType',
					sourceCode: 'not-exist',
					destinationCode: rootTypeCode2,
				},
				404,
				/record missing/,
			);
			await Promise.all([
				verifyExists('RootType', rootTypeCode1),
				verifyExists('RootType', rootTypeCode2),
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});
		it('errors if destination code does not exist', async () => {
			await testMergeRequest(
				{
					type: 'RootType',
					sourceCode: rootTypeCode1,
					destinationCode: 'not-exist',
				},
				404,
				/record missing/,
			);
			await Promise.all([
				verifyExists('RootType', rootTypeCode1),
				verifyExists('RootType', rootTypeCode2),
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});
	});
	describe('successful application', () => {
		describe('properties', () => {
			it('merges unconnected nodes', async () => {
				await sandbox.createNodes(
					['RootType', rootTypeCode1],
					['RootType', rootTypeCode2],
				);

				await testMergeRequest({
					type: 'RootType',
					sourceCode: rootTypeCode1,
					destinationCode: rootTypeCode2,
				});
				await Promise.all([
					verifyNotExists('RootType', rootTypeCode1),
					verifyExists('RootType', rootTypeCode2),
				]);
				sandbox.expectKinesisEvents([
					'DELETE',
					rootTypeCode1,
					'RootType',
				]);
			});

			it('merges ordinary properties', async () => {
				sandbox.setS3Responses({ merge: {} });
				await sandbox.createNodes(
					[
						'RootType',
						{
							code: rootTypeCode1,
							someString: 'Fake String',
							anotherString: 'Another Fake String',
						},
					],
					[
						'RootType',
						{
							code: rootTypeCode2,
							anotherString: 'A Third Fake String',
						},
					],
				);
				await testMergeRequest(
					{
						type: 'RootType',
						sourceCode: rootTypeCode1,
						destinationCode: rootTypeCode2,
					},
					200,
					sandbox.withUpdateMeta({
						code: rootTypeCode2,
						someString: 'Fake String',
						anotherString: 'A Third Fake String',
					}),
				);
				sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
			});

			it('merges document properties', async () => {
				await sandbox.createNodes(
					[
						'RootType',

						{
							code: rootTypeCode1,
							someDocument: 'Fake Document',
							anotherDocument: 'Another Fake Document',
						},
					],
					[
						'RootType',
						{
							code: rootTypeCode2,
							anotherDocument: 'A Third Fake Document',
						},
					],
				);
				await testMergeRequest(
					{
						type: 'RootType',
						sourceCode: rootTypeCode1,
						destinationCode: rootTypeCode2,
					},
					200,
					sandbox.withUpdateMeta({
						code: rootTypeCode2,
						someDocument: 'Fake Document',
						anotherDocument: 'A Third Fake Document',
					}),
				);
				sandbox.expectS3Actions({
					action: 'merge',
					nodeType: 'RootType',
					sourceCode: rootTypeCode1,
					destinationCode: rootTypeCode2,
				});
			});

			it("doesn't error when unrecognised properties exist", async () => {
				await sandbox.createNodes(
					[
						'RootType',
						{ code: rootTypeCode1, notInSchema: 'someVal' },
					],
					['RootType', rootTypeCode2],
				);

				await testMergeRequest({
					type: 'RootType',
					sourceCode: rootTypeCode1,
					destinationCode: rootTypeCode2,
				});
				await Promise.all([
					verifyNotExists('RootType', rootTypeCode1),
					verifyExists('RootType', rootTypeCode2),
				]);

				await testNode(
					'RootType',
					rootTypeCode2,
					sandbox.withUpdateMeta({
						code: rootTypeCode2,
						notInSchema: 'someVal',
					}),
				);
				sandbox.expectKinesisEvents([
					'DELETE',
					rootTypeCode1,
					'RootType',
				]);
			});

			it('not modify existing properties of destination node', async () => {
				await sandbox.createNodes(
					['RootType', { code: rootTypeCode1, someString: 'potato' }],
					['RootType', { code: rootTypeCode2, someString: 'tomato' }],
				);
				await testMergeRequest({
					type: 'RootType',
					sourceCode: rootTypeCode1,
					destinationCode: rootTypeCode2,
				});
				await testNode(
					'RootType',
					rootTypeCode2,
					sandbox.withMeta({
						code: rootTypeCode2,
						someString: 'tomato',
					}),
				);

				sandbox.expectKinesisEvents([
					'DELETE',
					rootTypeCode1,
					'RootType',
				]);
			});

			it('add new properties to destination node', async () => {
				await sandbox.createNodes(
					['RootType', { code: rootTypeCode1, someString: 'potato' }],
					['RootType', { code: rootTypeCode2 }],
				);
				await testMergeRequest({
					type: 'RootType',
					sourceCode: rootTypeCode1,
					destinationCode: rootTypeCode2,
				});
				await testNode(
					'RootType',
					rootTypeCode2,
					sandbox.withMeta({
						code: rootTypeCode2,
						someString: 'potato',
					}),
				);

				sandbox.expectKinesisEvents(
					['DELETE', rootTypeCode1, 'RootType'],
					['UPDATE', rootTypeCode2, 'RootType', ['someString']],
				);
			});
		});

		describe('relationships', () => {
			it('move outgoing relationships', async () => {
				const [rootType1, , childType] = await sandbox.createNodes(
					['RootType', rootTypeCode1],
					['RootType', rootTypeCode2],
					['ChildType', childTypeCode],
				);

				await sandbox.connectNodes(rootType1, 'HAS_CHILD', childType);

				await testMergeRequest({
					type: 'RootType',
					sourceCode: rootTypeCode1,
					destinationCode: rootTypeCode2,
				});
				await verifyNotExists('RootType', rootTypeCode1);

				await testNode(
					'RootType',
					rootTypeCode2,
					sandbox.withMeta({
						code: rootTypeCode2,
					}),
					[
						{
							type: 'HAS_CHILD',
							direction: 'outgoing',
							props: sandbox.withMeta({}),
						},
						{
							type: 'ChildType',
							props: sandbox.withMeta({ code: childTypeCode }),
						},
					],
				);

				sandbox.expectKinesisEvents(
					['DELETE', rootTypeCode1, 'RootType'],
					['UPDATE', rootTypeCode2, 'RootType', ['children']],
					['UPDATE', childTypeCode, 'ChildType', ['isChildOf']],
				);
			});

			it('move incoming relationships', async () => {
				const [rootType1, , parentType] = await sandbox.createNodes(
					['RootType', rootTypeCode1],
					['RootType', rootTypeCode2],
					['ParentType', parentTypeCode],
				);

				await sandbox.connectNodes(
					parentType,
					'HAS_ROOT_CHILD',
					rootType1,
				);

				await testMergeRequest({
					type: 'RootType',
					sourceCode: rootTypeCode1,
					destinationCode: rootTypeCode2,
				});
				await verifyNotExists('RootType', rootTypeCode1);

				await testNode(
					'RootType',
					rootTypeCode2,
					sandbox.withMeta({
						code: rootTypeCode2,
					}),
					[
						{
							type: 'HAS_ROOT_CHILD',
							direction: 'incoming',
							props: sandbox.withMeta({}),
						},
						{
							type: 'ParentType',
							props: sandbox.withMeta({ code: parentTypeCode }),
						},
					],
				);

				sandbox.expectKinesisEvents(
					['DELETE', rootTypeCode1, 'RootType'],
					['UPDATE', rootTypeCode2, 'RootType', ['parents']],
					['UPDATE', parentTypeCode, 'ParentType', ['isParentOf']],
				);
			});

			it('merges identical relationships', async () => {
				const [
					rootType1,
					rootType2,
					childType,
				] = await sandbox.createNodes(
					['RootType', rootTypeCode1],
					['RootType', rootTypeCode2],
					['ChildType', childTypeCode],
				);

				await sandbox.connectNodes(
					[rootType1, 'HAS_CHILD', childType],
					[rootType2, 'HAS_CHILD', childType],
				);

				await testMergeRequest({
					type: 'RootType',
					sourceCode: rootTypeCode1,
					destinationCode: rootTypeCode2,
				});
				await verifyNotExists('RootType', rootTypeCode1);

				await testNode(
					'RootType',
					rootTypeCode2,
					sandbox.withMeta({
						code: rootTypeCode2,
					}),
					[
						{
							type: 'HAS_CHILD',
							direction: 'outgoing',
							props: sandbox.withMeta({}),
						},
						{
							type: 'ChildType',
							props: sandbox.withMeta({ code: childTypeCode }),
						},
					],
				);
				sandbox.expectKinesisEvents([
					'DELETE',
					rootTypeCode1,
					'RootType',
				]);
			});

			it('discard any newly reflexive relationships', async () => {
				const [rootType1, rootType2] = await sandbox.createNodes(
					['RootType', rootTypeCode1],
					['RootType', rootTypeCode2],
				);

				await sandbox.connectNodes(
					rootType1,
					'HAS_YOUNGER_SIBLING',
					rootType2,
				);
				await testMergeRequest({
					type: 'RootType',
					sourceCode: rootTypeCode1,
					destinationCode: rootTypeCode2,
				});
				await verifyNotExists('RootType', rootTypeCode1);

				await testNode(
					'RootType',
					rootTypeCode2,
					sandbox.withMeta({
						code: rootTypeCode2,
					}),
				);
				sandbox.expectKinesisEvents(
					['DELETE', rootTypeCode1, 'RootType'],
					['UPDATE', rootTypeCode2, 'RootType', ['olderSiblings']],
				);
			});

			it('does not overwrite __-to-one relationships', async () => {
				const [
					RootType1,
					RootType2,
					childType1,
					childType2,
				] = await sandbox.createNodes(
					['RootType', `${namespace}-root-1`],
					['RootType', `${namespace}-root-2`],
					['ChildType', `${namespace}-child-type-1`],
					['ChildType', `${namespace}-child-type-2`],
				);

				await sandbox.connectNodes(
					[RootType1, 'HAS_FAVOURITE_CHILD', childType1],
					[RootType2, 'HAS_FAVOURITE_CHILD', childType2],
				);

				await testMergeRequest({
					type: 'RootType',
					sourceCode: `${namespace}-root-1`,
					destinationCode: `${namespace}-root-2`,
				});
				await verifyNotExists('RootType', rootTypeCode1);

				await testNode(
					'RootType',
					`${namespace}-root-2`,
					sandbox.withMeta({
						code: `${namespace}-root-2`,
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
								code: `${namespace}-child-type-2`,
							}),
						},
					],
				);
				sandbox.expectKinesisEvents(
					['DELETE', `${namespace}-root-1`, 'RootType'],
					[
						'UPDATE',
						`${namespace}-child-type-1`,
						'ChildType',
						['isFavouriteChildOf'],
					],
				);
			});
		});
	});
});

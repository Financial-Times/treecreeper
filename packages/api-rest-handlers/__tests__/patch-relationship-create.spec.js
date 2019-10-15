const neo4jTemporalTypes = require('neo4j-driver/lib/v1/temporal-types');
const { patchHandler } = require('../patch');

const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { securityTests } = require('../../../test-helpers/security');
const {
	dbUnavailable,
	asyncErrorFunction,
} = require('../../../test-helpers/error-stubs');

describe('rest PATCH relationship create', () => {
	const namespace = 'api-rest-handlers-patch-relationship-create';
	const mainCode = `${namespace}-main`;

	const { createNodes, createNode, meta, getMetaPayload } = setupMocks(
		namespace,
	);

	securityTests(patchHandler(), mainCode);

	const getInput = (body, query, metadata) => ({
		type: 'MainType',
		code: mainCode,
		body,
		query,
		metadata,
	});

	const getS3PatchMock = body =>
		jest.fn(async () => ({
			versionId: 'fake-id',
			newBodyDocs: body,
		}));

	const basicHandler = (...args) => patchHandler()(getInput(...args));

	const createMainNode = (props = {}) =>
		createNode('MainType', Object.assign({ code: mainCode }, props));

	it('errors if updating relationships without relationshipAction query string', async () => {});
	describe('__-to-one relationships', () => {
		it('accept a string', async () => {});
		it('accept an array of length one', async () => {});
		it('error if trying to write multiple relationships', async () => {});
		it('replace existing relationship', async () => {});
	});
	describe('merge', () => {
		it('can merge with empty relationship set if relationshipAction=merge', async () => {});
		it('can merge with relationships if relationshipAction=merge', async () => {});
	});
	describe('replace', () => {
		it('can replace an empty relationship set if relationshipAction=replace', async () => {});
		it('can replace relationships if relationshipAction=replace', async () => {});
		it('leaves relationships in other direction and of other types untouched when replacing', async () => {});
		it('replaces relationships in multiple directions', async () => {});
	});
	describe('upsert', () => {
		it('create node related to non-existent nodes when using upsert=true', async () => {});
		it('not leave creation artifacts on things that already existed when using `upsert=true`', async () => {});
	});
	describe('diffing before writes', () => {
		it('writes if property but no relationship changes detected', async () => {});
		it('writes if relationship but no property changes detected', async () => {});
		it('detects deleted property as a change', async () => {});
	});
	describe('patching with fewer relationships', () => {
		it('treats fewer relationships as a delete when replacing relationships', async () => {});
		it('treats fewer relationships as no change when merging relationships', async () => {});
	});
});























		describe('creating', () => {
			it('errors if updating relationships without relationshipAction query string', async () => {
				await sandbox.createNode('MainType', mainCode);
				await testPatchRequest(
					`/v2/node/MainType/${mainCode}`,
					{
						children: [childCode],
					},
					400,
					/PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`/,
				);

				await testNode(
					'MainType',
					mainCode,
					sandbox.withMeta({ code: mainCode }),
				);
				sandbox.expectNoKinesisEvents();
				sandbox.expectNoS3Actions('upload', 'delete', 'patch');
			});

			describe('__-to-one relationships', () => {
				['merge', 'replace'].forEach(action => {
					it('accept a string', async () => {
						await sandbox.createNodes(
							['MainType', mainCode],
							['ChildType', childCode],
						);
						await testPatchRequest(
							`/v2/node/MainType/${mainCode}?relationshipAction=${action}`,
							{
								favouriteChild: childCode,
							},
							200,
							sandbox.withMeta({
								code: mainCode,
								favouriteChild: childCode,
							}),
						);

						await testNode(
							'MainType',
							mainCode,
							sandbox.withMeta({
								code: mainCode,
							}),
							[
								{
									type: 'HAS_FAVOURITE_CHILD',
									direction: 'outgoing',
									props: sandbox.withCreateMeta({}),
								},
								{
									type: 'ChildType',
									props: sandbox.withMeta({
										code: childCode,
									}),
								},
							],
						);

						sandbox.expectKinesisEvents(
							[
								'UPDATE',
								mainCode,
								'MainType',
								['favouriteChild'],
							],
							[
								'UPDATE',
								childCode,
								'ChildType',
								['isFavouriteChildOf'],
							],
						);
						sandbox.expectNoS3Actions('upload', 'delete', 'patch');
					});
					it('accept an array of length one', async () => {
						await sandbox.createNodes(
							['MainType', mainCode],
							['ChildType', childCode],
						);
						await testPatchRequest(
							`/v2/node/MainType/${mainCode}?relationshipAction=${action}`,
							{
								favouriteChild: [childCode],
							},
							200,
							sandbox.withMeta({
								code: mainCode,
								favouriteChild: childCode,
							}),
						);

						await testNode(
							'MainType',
							mainCode,
							sandbox.withMeta({
								code: mainCode,
							}),
							[
								{
									type: 'HAS_FAVOURITE_CHILD',
									direction: 'outgoing',
									props: sandbox.withCreateMeta({}),
								},
								{
									type: 'ChildType',
									props: sandbox.withMeta({
										code: childCode,
									}),
								},
							],
						);

						sandbox.expectKinesisEvents(
							[
								'UPDATE',
								mainCode,
								'MainType',
								['favouriteChild'],
							],
							[
								'UPDATE',
								childCode,
								'ChildType',
								['isFavouriteChildOf'],
							],
						);
						sandbox.expectNoS3Actions('upload', 'delete', 'patch');
					});
					it('error if trying to write multiple relationships', async () => {
						await sandbox.createNodes(
							['MainType', mainCode],
							['ChildType', `${childCode}-1`],
							['ChildType', `${childCode}-2`],
						);
						await testPatchRequest(
							`/v2/node/MainType/${mainCode}?relationshipAction=${action}`,
							{
								favouriteChild: [
									`${childCode}-1`,
									`${childCode}-2`,
								],
							},
							400,
							/Can only have one favouriteChild/,
						);

						await testNode(
							'MainType',
							mainCode,
							sandbox.withMeta({
								code: mainCode,
							}),
						);

						sandbox.expectNoKinesisEvents();
						sandbox.expectNoS3Actions('upload', 'delete', 'patch');
					});

					it('replace existing relationship', async () => {
						const [main, child1] = await sandbox.createNodes(
							['MainType', mainCode],
							['ChildType', `${childCode}-1`],
							['ChildType', `${childCode}-2`],
						);

						await sandbox.connectNodes(
							main,
							'HAS_FAVOURITE_CHILD',
							child1,
						);
						await testPatchRequest(
							`/v2/node/MainType/${mainCode}?relationshipAction=${action}`,
							{
								favouriteChild: [`${childCode}-2`],
							},
							200,
							sandbox.withMeta({
								code: mainCode,
								favouriteChild: `${childCode}-2`,
							}),
						);

						await testNode(
							'MainType',
							mainCode,
							sandbox.withMeta({
								code: mainCode,
							}),
							[
								{
									type: 'HAS_FAVOURITE_CHILD',
									direction: 'outgoing',
									props: sandbox.withCreateMeta({}),
								},
								{
									type: 'ChildType',
									props: sandbox.withMeta({
										code: `${childCode}-2`,
									}),
								},
							],
						);

						sandbox.expectKinesisEvents(
							[
								'UPDATE',
								mainCode,
								'MainType',
								['favouriteChild'],
							],
							[
								'UPDATE',
								`${childCode}-1`,
								'ChildType',
								['isFavouriteChildOf'],
							],
							[
								'UPDATE',
								`${childCode}-2`,
								'ChildType',
								['isFavouriteChildOf'],
							],
						);
						sandbox.expectNoS3Actions('upload', 'delete', 'patch');
					});

					it.skip('not replace existing relationship in opposite direction', async () => {
						// schema doesn't support any one-to-one relationships in both directions, so not possible to test this yet,
					});
				});
			});

			describe('merge', () => {
				it('can merge with empty relationship set if relationshipAction=merge', async () => {
					await sandbox.createNodes(
						['MainType', mainCode],
						['ChildType', childCode],
					);
					await testPatchRequest(
						`/v2/node/MainType/${mainCode}?relationshipAction=merge`,
						{
							children: [childCode],
						},
						200,
						sandbox.withMeta({
							code: mainCode,
							children: [childCode],
						}),
					);

					await testNode(
						'MainType',
						mainCode,
						sandbox.withMeta({
							code: mainCode,
						}),
						[
							{
								type: 'HAS_CHILD',
								direction: 'outgoing',
								props: sandbox.withCreateMeta({}),
							},
							{
								type: 'ChildType',
								props: sandbox.withMeta({ code: childCode }),
							},
						],
					);
					sandbox.expectKinesisEvents(
						['UPDATE', mainCode, 'MainType', ['children']],
						['UPDATE', childCode, 'ChildType', ['isChildOf']],
					);
					sandbox.expectNoS3Actions('upload', 'delete', 'patch');
				});
				it('can merge with relationships if relationshipAction=merge', async () => {
					const [main, child1] = await sandbox.createNodes(
						['MainType', mainCode],
						['ChildType', `${childCode}-1`],
						['ChildType', `${childCode}-2`],
					);
					await sandbox.connectNodes(main, ['HAS_CHILD'], child1);

					await testPatchRequest(
						`/v2/node/MainType/${mainCode}?relationshipAction=merge`,
						{
							children: [`${childCode}-2`],
						},
						200,
						sandbox.withMeta({
							code: mainCode,
							children: [`${childCode}-2`, `${childCode}-1`],
						}),
					);

					await testNode(
						'MainType',
						mainCode,
						sandbox.withMeta({
							code: mainCode,
						}),
						[
							{
								type: 'HAS_CHILD',
								direction: 'outgoing',
								props: sandbox.withMeta({}),
							},
							{
								type: 'ChildType',
								props: sandbox.withMeta({
									code: `${childCode}-1`,
								}),
							},
						],
						[
							{
								type: 'HAS_CHILD',
								direction: 'outgoing',
								props: sandbox.withCreateMeta({}),
							},
							{
								type: 'ChildType',
								props: sandbox.withMeta({
									code: `${childCode}-2`,
								}),
							},
						],
					);
					sandbox.expectKinesisEvents(
						['UPDATE', mainCode, 'MainType', ['children']],
						[
							'UPDATE',
							`${childCode}-2`,
							'ChildType',
							['isChildOf'],
						],
					);
					sandbox.expectNoS3Actions('upload', 'delete', 'patch');
				});
			});

			describe('replace', () => {
				it('can replace an empty relationship set if relationshipAction=replace', async () => {
					await sandbox.createNodes(
						['MainType', mainCode],
						['ChildType', childCode],
					);
					await testPatchRequest(
						`/v2/node/MainType/${mainCode}?relationshipAction=replace`,
						{
							children: [childCode],
						},
						200,
						sandbox.withMeta({
							code: mainCode,
							children: [childCode],
						}),
					);

					await testNode(
						'MainType',
						mainCode,
						sandbox.withMeta({
							code: mainCode,
						}),
						[
							{
								type: 'HAS_CHILD',
								direction: 'outgoing',
								props: sandbox.withCreateMeta({}),
							},
							{
								type: 'ChildType',
								props: sandbox.withMeta({ code: childCode }),
							},
						],
					);

					sandbox.expectKinesisEvents(
						['UPDATE', mainCode, 'MainType', ['children']],
						['UPDATE', childCode, 'ChildType', ['isChildOf']],
					);
					sandbox.expectNoS3Actions('upload', 'delete', 'patch');
				});

				it('can replace relationships if relationshipAction=replace', async () => {
					const [main, child1] = await sandbox.createNodes(
						['MainType', mainCode],
						['ChildType', `${childCode}-1`],
						['ChildType', `${childCode}-2`],
					);
					await sandbox.connectNodes(main, ['HAS_CHILD'], child1);

					await testPatchRequest(
						`/v2/node/MainType/${mainCode}?relationshipAction=replace`,
						{
							children: [`${childCode}-2`],
						},
						200,
						sandbox.withMeta({
							code: mainCode,
							children: [`${childCode}-2`],
						}),
					);

					await testNode(
						'MainType',
						mainCode,
						sandbox.withMeta({
							code: mainCode,
						}),
						[
							{
								type: 'HAS_CHILD',
								direction: 'outgoing',
								props: sandbox.withCreateMeta({}),
							},
							{
								type: 'ChildType',
								props: sandbox.withMeta({
									code: `${childCode}-2`,
								}),
							},
						],
					);
					sandbox.expectKinesisEvents(
						['UPDATE', mainCode, 'MainType', ['children']],
						[
							'UPDATE',
							`${childCode}-1`,
							'ChildType',
							['isChildOf'],
						],
						[
							'UPDATE',
							`${childCode}-2`,
							'ChildType',
							['isChildOf'],
						],
					);
					sandbox.expectNoS3Actions('upload', 'delete', 'patch');
				});

				it('leaves relationships in other direction and of other types untouched when replacing', async () => {
					const [main1, main2, , child] = await sandbox.createNodes(
						['MainType', `${mainCode}-1`],
						['MainType', `${mainCode}-2`],
						['MainType', `${mainCode}-3`],
						['ChildType', childCode],
					);
					await sandbox.connectNodes([
						main1,
						'HAS_YOUNGER_SIBLING',
						main2,
					]);
					await sandbox.connectNodes([main2, 'HAS_CHILD', child]);

					await testPatchRequest(
						`/v2/node/MainType/${mainCode}-2?relationshipAction=replace`,
						{
							youngerSiblings: [`${mainCode}-3`],
						},
						200,
						sandbox.withMeta({
							code: `${mainCode}-2`,
							youngerSiblings: [`${mainCode}-3`],
							olderSiblings: [`${mainCode}-1`],
							children: [childCode],
						}),
					);

					await testNode(
						'MainType',
						`${mainCode}-2`,
						sandbox.withMeta({
							code: `${mainCode}-2`,
						}),
						[
							{
								type: 'HAS_YOUNGER_SIBLING',
								direction: 'incoming',
								props: sandbox.withMeta({}),
							},
							{
								type: 'MainType',
								props: sandbox.withMeta({
									code: `${mainCode}-1`,
								}),
							},
						],
						[
							{
								type: 'HAS_YOUNGER_SIBLING',
								direction: 'outgoing',
								props: sandbox.withCreateMeta({}),
							},
							{
								type: 'MainType',
								props: sandbox.withMeta({
									code: `${mainCode}-3`,
								}),
							},
						],
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
						[
							'UPDATE',
							`${mainCode}-2`,
							'MainType',
							['youngerSiblings'],
						],
						[
							'UPDATE',
							`${mainCode}-3`,
							'MainType',
							['olderSiblings'],
						],
					);
					sandbox.expectNoS3Actions('upload', 'delete', 'patch');
				});

				it('replaces relationships in multiple directions', async () => {
					const [main1, main2, main3] = await sandbox.createNodes(
						['MainType', `${mainCode}-1`],
						['MainType', `${mainCode}-2`],
						['MainType', `${mainCode}-3`],
					);
					await sandbox.connectNodes([
						main1,
						'HAS_YOUNGER_SIBLING',
						main2,
					]);
					await sandbox.connectNodes([
						main2,
						'HAS_YOUNGER_SIBLING',
						main3,
					]);

					await testPatchRequest(
						`/v2/node/MainType/${mainCode}-2?relationshipAction=replace`,
						{
							youngerSiblings: [`${mainCode}-1`],
							olderSiblings: [`${mainCode}-3`],
						},
						200,
						sandbox.withMeta({
							code: `${mainCode}-2`,
							youngerSiblings: [`${mainCode}-1`],
							olderSiblings: [`${mainCode}-3`],
						}),
					);

					await testNode(
						'MainType',
						`${mainCode}-2`,
						sandbox.withMeta({
							code: `${mainCode}-2`,
						}),
						[
							{
								type: 'HAS_YOUNGER_SIBLING',
								direction: 'incoming',
								props: sandbox.withCreateMeta({}),
							},
							{
								type: 'MainType',
								props: sandbox.withMeta({
									code: `${mainCode}-3`,
								}),
							},
						],
						[
							{
								type: 'HAS_YOUNGER_SIBLING',
								direction: 'outgoing',
								props: sandbox.withCreateMeta({}),
							},
							{
								type: 'MainType',
								props: sandbox.withMeta({
									code: `${mainCode}-1`,
								}),
							},
						],
					);
					sandbox.expectKinesisEvents(
						[
							'UPDATE',
							`${mainCode}-1`,
							'MainType',
							['olderSiblings', 'youngerSiblings'],
						],
						[
							'UPDATE',
							`${mainCode}-2`,
							'MainType',
							['olderSiblings', 'youngerSiblings'],
						],
						[
							'UPDATE',
							`${mainCode}-3`,
							'MainType',
							['olderSiblings', 'youngerSiblings'],
						],
					);
					sandbox.expectNoS3Actions('upload', 'delete', 'patch');
				});
			});

			describe('upsert', () => {
				['merge', 'replace'].forEach(action => {
					describe(`with ${action}`, () => {
						it(`error when relationship to non-existent node`, async () => {
							await testPatchRequest(
								`/v2/node/MainType/${mainCode}?relationshipAction=${action}`,
								{
									children: [childCode],
								},
								400,
								/Missing related node/,
							);
							sandbox.expectNoKinesisEvents();
							sandbox.expectNoS3Actions(
								'upload',
								'delete',
								'patch',
							);
						});

						it('create node related to non-existent nodes when using upsert=true', async () => {
							await sandbox.createNode('MainType', mainCode);
							await testPatchRequest(
								`/v2/node/MainType/${mainCode}?relationshipAction=${action}&upsert=true`,
								{
									children: [childCode],
								},
								200,
								sandbox.withMeta({
									code: mainCode,
									children: [childCode],
								}),
							);
							await testNode(
								'MainType',
								mainCode,
								sandbox.withMeta({
									code: mainCode,
								}),
								[
									{
										type: 'HAS_CHILD',
										direction: 'outgoing',
										props: sandbox.withCreateMeta({}),
									},
									{
										type: 'ChildType',
										props: sandbox.withCreateMeta({
											code: childCode,
										}),
									},
								],
							);

							sandbox.expectKinesisEvents(
								['UPDATE', mainCode, 'MainType', ['children']],
								[
									'CREATE',
									childCode,
									'ChildType',
									['code', 'isChildOf'],
								],
							);
							sandbox.expectNoS3Actions(
								'upload',
								'delete',
								'patch',
							);
						});

						it('not leave creation artifacts on things that already existed when using `upsert=true`', async () => {
							await sandbox.createNode('MainType', mainCode);
							await sandbox.createNode('ChildType', childCode);
							await testPatchRequest(
								`/v2/node/MainType/${mainCode}?relationshipAction=${action}&upsert=true`,
								{
									children: [childCode],
								},
								200,
								sandbox.withMeta({
									code: mainCode,
									children: [childCode],
								}),
							);
							await testNode(
								'MainType',
								mainCode,
								sandbox.withMeta({
									code: mainCode,
								}),
								[
									{
										type: 'HAS_CHILD',
										direction: 'outgoing',
										props: sandbox.withCreateMeta({}),
									},
									{
										type: 'ChildType',
										props: sandbox.withMeta({
											code: childCode,
										}),
									},
								],
							);

							sandbox.expectKinesisEvents(
								['UPDATE', mainCode, 'MainType', ['children']],
								[
									'UPDATE',
									childCode,
									'ChildType',
									['isChildOf'],
								],
							);
							sandbox.expectNoS3Actions(
								'upload',
								'delete',
								'patch',
							);
						});
					});
				});
			});
		});
	});

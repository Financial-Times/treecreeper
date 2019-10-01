const neo4jTemporalTypes = require('neo4j-driver/lib/v1/temporal-types');
const app = require('../../server/app.js');

const { API_KEY } = process.env;
const {
	setupMocks,
	stubDbUnavailable,
	stubS3Unavailable,
	testNode,
	spyDbQuery,
	verifyNotExists,
} = require('../helpers');

describe('v2 - node PATCH', () => {
	const sandbox = {};
	const namespace = 'v2-node-patch';

	const mainCode = `${namespace}-main`;
	const restrictedCode = `${namespace}-restricted`;
	const childCode = `${namespace}-child`;
	const parentCode = `${namespace}-parent`;

	setupMocks(sandbox, { namespace });

	const testPatchRequest = (url, data, ...expectations) => {
		let req = sandbox
			.request(app)
			.patch(url)
			.namespacedAuth();

		if (data) {
			req = req.send(data);
		}

		return req.expect(...expectations);
	};

	it('update node in neo4j with non-document properties only', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
			someString: 'name1',
		});
		await testPatchRequest(
			`/v2/node/MainType/${mainCode}`,
			{
				someString: 'name2',
			},
			200,
			sandbox.withUpdateMeta({
				someString: 'name2',
				code: mainCode,
			}),
		);

		await testNode(
			'MainType',
			mainCode,
			sandbox.withUpdateMeta({
				someString: 'name2',
				code: mainCode,
			}),
		);

		sandbox.expectKinesisEvents([
			'UPDATE',
			mainCode,
			'MainType',
			['someString'],
		]);
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it('update node in s3 with document properties only', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
		});
		await testPatchRequest(
			`/v2/node/MainType/${mainCode}`,
			{
				someDocument: 'Another Fake Document',
			},
			200,
			sandbox.withUpdateMeta({
				code: mainCode,
				someDocument: 'Another Fake Document',
			}),
		);

		await testNode(
			'MainType',
			mainCode,
			sandbox.withUpdateMeta({
				code: mainCode,
			}),
		);
		sandbox.expectKinesisEvents([
			'UPDATE',
			mainCode,
			'MainType',
			['someDocument'],
		]);
		sandbox.expectS3Actions({
			action: 'patch',
			nodeType: 'MainType',
			code: mainCode,
			body: {
				someDocument: 'Another Fake Document',
			},
		});
		sandbox.expectNoS3Actions('upload', 'delete');
	});

	it('update node in neo4j and s3 with document and non-document properties', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
		});
		await testPatchRequest(
			`/v2/node/MainType/${mainCode}`,
			{
				someString: 'name1',
				someDocument: 'Another Fake Document',
			},
			200,
			sandbox.withUpdateMeta({
				code: mainCode,
				someString: 'name1',
				someDocument: 'Another Fake Document',
			}),
		);

		await testNode(
			'MainType',
			mainCode,
			sandbox.withUpdateMeta({
				someString: 'name1',
				code: mainCode,
			}),
		);

		sandbox.expectKinesisEvents([
			'UPDATE',
			mainCode,
			'MainType',
			['someString', 'someDocument'],
		]);
		sandbox.expectS3Actions({
			action: 'patch',
			nodeType: 'MainType',
			code: mainCode,
			body: {
				someDocument: 'Another Fake Document',
			},
		});
		sandbox.expectNoS3Actions('upload', 'delete');
	});

	it('Not create property when passed empty string', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
			someString: 'name1',
		});
		await testPatchRequest(
			`/v2/node/MainType/${mainCode}`,
			{
				anotherString: '',
			},
			200,
			sandbox.withUpdateMeta({
				code: mainCode,
				someString: 'name1',
			}),
		);

		await testNode(
			'MainType',
			mainCode,
			sandbox.withUpdateMeta({
				someString: 'name1',
				code: mainCode,
			}),
		);
		sandbox.expectNoKinesisEvents();
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it.skip('Not set Document property when empty string provided', async () => {
		// TODO need to write a test here
	});

	describe('temporal properties', () => {
		it('Set Date property when no previous value', async () => {
			const isoDateString = '2019-01-09';
			const date = new Date(isoDateString);
			await sandbox.createNode('MainType', {
				code: mainCode,
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}`,
				{ someDate: date.toISOString() },
				200,
				sandbox.withUpdateMeta({
					code: mainCode,
					someDate: isoDateString,
				}),
			);

			await testNode(
				'MainType',
				mainCode,
				sandbox.withUpdateMeta({
					code: mainCode,
					someDate: isoDateString,
				}),
			);
			sandbox.expectKinesisEvents([
				'UPDATE',
				mainCode,
				'MainType',
				['someDate'],
			]);
			sandbox.expectNoS3Actions('upload', 'delete', 'patch');
		});

		it('Overwrite existing Date property', async () => {
			const isoDateString = '2019-01-09';
			const date = new Date(isoDateString);
			await sandbox.createNode('MainType', {
				code: mainCode,
				someDate: neo4jTemporalTypes.Date.fromStandardDate(
					new Date('2018-01-09'),
				),
			});

			await testPatchRequest(
				`/v2/node/MainType/${mainCode}`,
				{ someDate: date.toISOString() },
				200,
				sandbox.withUpdateMeta({
					code: mainCode,
					someDate: isoDateString,
				}),
			);

			await testNode(
				'MainType',
				mainCode,
				sandbox.withUpdateMeta({
					code: mainCode,
					someDate: isoDateString,
				}),
			);
			sandbox.expectKinesisEvents([
				'UPDATE',
				mainCode,
				'MainType',
				['someDate'],
			]);
			sandbox.expectNoS3Actions('upload', 'delete', 'patch');
		});

		it("Not overwrite when 'same' Date sent", async () => {
			const isoDateString = '2019-01-09';
			const date = new Date(isoDateString);
			await sandbox.createNode('MainType', {
				code: mainCode,
				someDate: neo4jTemporalTypes.Date.fromStandardDate(date),
			});

			await testPatchRequest(
				`/v2/node/MainType/${mainCode}`,
				{ someDate: '2019-01-09' },
				200,
				sandbox.withUpdateMeta({
					code: mainCode,
					someDate: isoDateString,
				}),
			);

			await testNode(
				'MainType',
				mainCode,
				sandbox.withUpdateMeta({
					code: mainCode,
					someDate: isoDateString,
				}),
			);
			sandbox.expectNoKinesisEvents();
			sandbox.expectNoS3Actions('upload', 'delete', 'patch');
		});

		it.skip('Set DateTime property when no previous value', async () => {});

		it.skip('Overwrite existing DateTime property', async () => {});

		it.skip("Not overwrite when 'same' DateTime sent", async () => {});

		it.skip('Set Time property when no previous value', async () => {});

		it.skip('Overwrite existing Time property', async () => {});

		it.skip("Not overwrite when 'same' Time sent", async () => {});
	});

	it('Remove property when empty string sent in payload', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
			someString: 'name1',
			anotherString: 'anotherString',
		});
		await testPatchRequest(
			`/v2/node/MainType/${mainCode}`,
			{
				anotherString: '',
			},
			200,
			sandbox.withUpdateMeta({
				code: mainCode,
				someString: 'name1',
			}),
		);
		await testNode(
			'MainType',
			mainCode,
			sandbox.withUpdateMeta({
				someString: 'name1',
				code: mainCode,
			}),
		);
		sandbox.expectKinesisEvents([
			'UPDATE',
			mainCode,
			'MainType',
			['anotherString'],
		]);
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it('Not remove property when falsy value sent in payload', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
			someBoolean: true,
		});
		await testPatchRequest(
			`/v2/node/MainType/${mainCode}`,
			{
				someBoolean: false,
			},
			200,
			sandbox.withUpdateMeta({
				code: mainCode,
				someBoolean: false,
			}),
		);
		await testNode(
			'MainType',
			mainCode,
			sandbox.withUpdateMeta({
				someBoolean: false,
				code: mainCode,
			}),
		);
		sandbox.expectKinesisEvents([
			'UPDATE',
			mainCode,
			'MainType',
			['someBoolean'],
		]);
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it('Create when patching non-existent node', async () => {
		await testPatchRequest(
			`/v2/node/MainType/${mainCode}`,
			{
				someString: 'name1',
			},
			201,
			sandbox.withCreateMeta({
				someString: 'name1',
				code: mainCode,
			}),
		);

		await testNode(
			'MainType',
			mainCode,
			sandbox.withCreateMeta({
				someString: 'name1',
				code: mainCode,
			}),
		);
		sandbox.expectKinesisEvents([
			'CREATE',
			mainCode,
			'MainType',
			['someString', 'code'],
		]);
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it('Not create when patching non-existent restricted node', async () => {
		await testPatchRequest(
			`/v2/node/RestrictedType/${restrictedCode}`,
			{
				someString: 'name1',
			},
			400,
			new RegExp(
				`RestrictedTypes can only be created by restricted-type-creator`,
			),
		);

		await verifyNotExists('RestrictedType', restrictedCode);
		sandbox.expectNoKinesisEvents();
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it('Create when patching non-existent restricted node with correct client-id', async () => {
		const result = Object.assign(
			sandbox.withCreateMeta({
				someString: 'name1',
				code: restrictedCode,
			}),
			{
				_createdByClient: 'restricted-type-creator',
				_updatedByClient: 'restricted-type-creator',
			},
		);
		await sandbox
			.request(app)
			.patch(`/v2/node/RestrictedType/${restrictedCode}`)
			.set('API_KEY', process.env.API_KEY)
			.set('client-user-id', `${namespace}-user`)
			.set('x-request-id', `${namespace}-request`)
			.set('client-id', 'restricted-type-creator')
			.send({
				someString: 'name1',
			})
			.expect(201, result);

		await testNode('RestrictedType', restrictedCode, result);
		sandbox.expectKinesisEvents([
			'CREATE',
			restrictedCode,
			'RestrictedType',
			['someString', 'code'],
			'restricted-type-creator',
		]);
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it('error when conflicting code values', async () => {
		await testPatchRequest(
			`/v2/node/MainType/${mainCode}`,
			{
				code: 'wrong-code',
				someDocument: 'Fake Document',
			},
			400,
			new RegExp(
				`Conflicting code property \`wrong-code\` in payload for MainType ${mainCode}`,
			),
		);
		await verifyNotExists('MainType', mainCode);
		sandbox.expectNoKinesisEvents();
		// validatePayload throws before S3 actions
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it('error when unrecognised attribute', async () => {
		await testPatchRequest(
			`/v2/node/MainType/${mainCode}`,
			{
				notInSchema: 'unrecognised',
			},
			400,
			/Invalid property `notInSchema` on type `MainType`/,
		);
		await verifyNotExists('MainType', mainCode);
		sandbox.expectNoKinesisEvents();
		// getType from biz-ops-schema throws before s3 actions
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it('responds with 500 if neo4j query fails', async () => {
		stubDbUnavailable(sandbox);
		await testPatchRequest(
			`/v2/node/MainType/${mainCode}`,
			{
				someDocument: 'Fake Document',
			},
			500,
		);
		sandbox.expectNoKinesisEvents();
		// getNodeWithRelationships throws error before s3 delete
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it('responds with 500 if s3 query fails', async () => {
		stubS3Unavailable(sandbox);
		await testPatchRequest(
			`/v2/node/MainType/${mainCode}`,
			{
				someDocument: 'Fake Document',
			},
			500,
		);
		sandbox.expectNoKinesisEvents();
		// S3DocumentsHelper throws on instantiation
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it("deletes attributes which are provided as 'null'", async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
			someString: 'name1',
		});
		await testPatchRequest(
			`/v2/node/MainType/${mainCode}`,
			{
				someString: null,
			},
			200,
			sandbox.withUpdateMeta({
				code: mainCode,
			}),
		);

		await testNode(
			'MainType',
			mainCode,
			sandbox.withUpdateMeta({
				code: mainCode,
			}),
		);
		sandbox.expectKinesisEvents([
			'UPDATE',
			mainCode,
			'MainType',
			['someString'],
		]);
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it('no client-id header deletes the _updatedByClient metaProperty from the database', async () => {
		await sandbox.createNode('MainType', {
			code: `${namespace}-main`,
			someString: 'name1',
		});
		const expectedMeta = sandbox.withUpdateMeta({
			someString: 'name2',
			code: mainCode,
		});
		delete expectedMeta._updatedByClient;
		return sandbox
			.request(app)
			.patch(`/v2/node/MainType/${mainCode}`)
			.set('API_KEY', API_KEY)
			.set('client-user-id', `${namespace}-user`)
			.set('x-request-id', `${namespace}-request`)
			.send({ someString: 'name2' })
			.expect(200, expectedMeta);
	});

	it('no client-user-id header deletes the _updatedByUser metaProperty from the database', async () => {
		await sandbox.createNode('MainType', {
			code: `${namespace}-main`,
			someString: 'name1',
		});
		const expectedMeta = sandbox.withUpdateMeta({
			someString: 'name2',
			code: mainCode,
		});
		delete expectedMeta._updatedByUser;
		return sandbox
			.request(app)
			.patch(`/v2/node/MainType/${mainCode}`)
			.set('API_KEY', API_KEY)
			.set('client-id', `${namespace}-client`)
			.set('x-request-id', `${namespace}-request`)
			.send({ someString: 'name2' })
			.expect(200, expectedMeta);
	});

	describe('relationship patching', () => {
		describe('deleting', () => {
			it('errors if no relationshipAction query string when deleting relationship set', async () => {
				await sandbox.createNode('MainType', mainCode);
				await testPatchRequest(
					`/v2/node/MainType/${mainCode}`,
					{
						children: null,
					},
					400,
					/PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`/,
				);
				sandbox.expectNoKinesisEvents();
				sandbox.expectNoS3Actions('upload', 'delete', 'patch');
			});

			it('errors if no relationshipAction query string when deleting individual relationship', async () => {
				await sandbox.createNode('MainType', mainCode);
				await testPatchRequest(
					`/v2/node/MainType/${mainCode}`,
					{
						'!children': [childCode],
					},
					400,
					/PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`/,
				);
				sandbox.expectNoKinesisEvents();
				sandbox.expectNoS3Actions('upload', 'delete', 'patch');
			});
			['merge', 'replace'].forEach(action =>
				describe(`with ${action} action`, () => {
					describe('individual relationship delete', () => {
						it('can delete a specific relationship', async () => {
							const [
								main,
								child1,
								child2,
							] = await sandbox.createNodes(
								['MainType', mainCode],
								['ChildType', `${childCode}-1`],
								['ChildType', `${childCode}-2`],
							);
							await sandbox.connectNodes(
								[main, 'HAS_CHILD', child1],
								[main, 'HAS_CHILD', child2],
							);
							await testPatchRequest(
								`/v2/node/MainType/${mainCode}?relationshipAction=${action}`,
								{ '!children': [`${childCode}-1`] },
								200,
								sandbox.withMeta({
									code: mainCode,
									children: [`${childCode}-2`],
								}),
							);
						});

						it("can attempt to delete a specific relationship of type that doesn't exist", async () => {
							await sandbox.createNode('MainType', mainCode);
							await testPatchRequest(
								`/v2/node/MainType/${mainCode}?relationshipAction=${action}`,
								{ '!children': [childCode] },
								200,
								sandbox.withMeta({
									code: mainCode,
								}),
							);

							await testNode(
								'MainType',
								mainCode,
								sandbox.withMeta({
									code: mainCode,
								}),
							);
							sandbox.expectNoKinesisEvents();
							sandbox.expectNoS3Actions(
								'upload',
								'delete',
								'patch',
							);
						});

						it("can attempt to delete a specific relationship that doesn't exist", async () => {
							const [main, child1] = await sandbox.createNodes(
								['MainType', mainCode],
								['ChildType', `${childCode}-1`],
							);
							await sandbox.connectNodes([
								main,
								'HAS_CHILD',
								child1,
							]);
							await testPatchRequest(
								`/v2/node/MainType/${mainCode}?relationshipAction=${action}`,
								{ '!children': [`${childCode}-2`] },
								200,
								sandbox.withMeta({
									code: mainCode,
									children: [`${childCode}-1`],
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
							);
							sandbox.expectNoKinesisEvents();
							sandbox.expectNoS3Actions(
								'upload',
								'delete',
								'patch',
							);
						});

						it('can delete multiple specific relationships of the same kind', async () => {
							const [
								main,
								child1,
								child2,
								child3,
							] = await sandbox.createNodes(
								['MainType', mainCode],
								['ChildType', `${childCode}-1`],
								['ChildType', `${childCode}-2`],
								['ChildType', `${childCode}-3`],
							);
							await sandbox.connectNodes(
								[main, 'HAS_CHILD', child1],
								[main, 'HAS_CHILD', child2],
								[main, 'HAS_CHILD', child3],
							);
							await testPatchRequest(
								`/v2/node/MainType/${mainCode}?relationshipAction=${action}`,
								{
									'!children': [
										`${childCode}-1`,
										`${childCode}-3`,
									],
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
										props: sandbox.withMeta({}),
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
									`${childCode}-3`,
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

						it('can delete multiple specific relationships of different kinds', async () => {
							const [
								main,
								child,
								parent,
							] = await sandbox.createNodes(
								['MainType', mainCode],
								['ChildType', childCode],
								['ParentType', parentCode],
							);
							await sandbox.connectNodes(
								[main, 'HAS_CHILD', child],
								[parent, 'IS_PARENT_OF', main],
							);
							await testPatchRequest(
								`/v2/node/MainType/${mainCode}?relationshipAction=${action}`,
								{
									'!children': [childCode],
									'!parents': parentCode,
								},
								200,
								sandbox.withMeta({
									code: mainCode,
								}),
							);

							await testNode(
								'MainType',
								mainCode,
								sandbox.withMeta({
									code: mainCode,
								}),
							);
							sandbox.expectKinesisEvents(
								[
									'UPDATE',
									mainCode,
									'MainType',
									['children', 'parents'],
								],
								[
									'UPDATE',
									childCode,
									'ChildType',
									['isChildOf'],
								],
								[
									'UPDATE',
									parentCode,
									'ParentType',
									['isParentOf'],
								],
							);
							sandbox.expectNoS3Actions(
								'upload',
								'delete',
								'patch',
							);
						});
						it('leaves relationships in the opposite direction unaffected', async () => {
							const [
								main1,
								main2,
								main3,
							] = await sandbox.createNodes(
								['MainType', `${mainCode}-1`],
								['MainType', `${mainCode}-2`],
								['MainType', `${mainCode}-3`],
							);
							await sandbox.connectNodes(
								[main1, 'HAS_YOUNGER_SIBLING', main2],
								[main2, 'HAS_YOUNGER_SIBLING', main3],
							);
							await testPatchRequest(
								`/v2/node/MainType/${mainCode}-2?relationshipAction=${action}`,
								{ '!youngerSiblings': [`${mainCode}-3`] },
								200,
								sandbox.withMeta({
									code: `${mainCode}-2`,
									olderSiblings: [`${mainCode}-1`],
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
							);
							sandbox.expectKinesisEvents(
								[
									'UPDATE',
									`${mainCode}-3`,
									'MainType',
									['olderSiblings'],
								],
								[
									'UPDATE',
									`${mainCode}-2`,
									'MainType',
									['youngerSiblings'],
								],
							);
							sandbox.expectNoS3Actions(
								'upload',
								'delete',
								'patch',
							);
						});
						it('can add and remove relationships of the same type at the same time', async () => {
							const [main, child1] = await sandbox.createNodes(
								['MainType', mainCode],
								['ChildType', `${childCode}-1`],
								['ChildType', `${childCode}-2`],
							);
							await sandbox.connectNodes([
								main,
								'HAS_CHILD',
								child1,
							]);
							await testPatchRequest(
								`/v2/node/MainType/${mainCode}?relationshipAction=${action}`,
								{
									'!children': [`${childCode}-1`],
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
							sandbox.expectNoS3Actions(
								'upload',
								'delete',
								'patch',
							);
						});
						it('errors if deleting and adding the same relationship to the same record', async () => {
							await sandbox.createNodes(
								['MainType', mainCode],
								['ChildType', childCode],
							);
							await testPatchRequest(
								`/v2/node/MainType/${mainCode}?relationshipAction=${action}`,
								{
									children: [childCode],
									'!children': [childCode],
								},
								400,
								/Trying to add and remove a relationship to a record at the same time/,
							);

							await testNode(
								'MainType',
								mainCode,
								sandbox.withMeta({
									code: mainCode,
								}),
							);
							sandbox.expectNoKinesisEvents();
							sandbox.expectNoS3Actions(
								'upload',
								'delete',
								'patch',
							);
						});
					});

					describe('bulk relationship delete', () => {
						it('can delete empty relationship set', async () => {
							await sandbox.createNode('MainType', mainCode);
							await testPatchRequest(
								`/v2/node/MainType/${mainCode}?relationshipAction=${action}`,
								{ children: null },
								200,
								sandbox.withMeta({
									code: mainCode,
								}),
							);

							await testNode(
								'MainType',
								mainCode,
								sandbox.withMeta({
									code: mainCode,
								}),
							);
							sandbox.expectNoKinesisEvents();
							sandbox.expectNoS3Actions(
								'upload',
								'delete',
								'patch',
							);
						});

						it('can delete entire relationship sets', async () => {
							const [
								main,
								child,
								parent,
							] = await sandbox.createNodes(
								['MainType', mainCode],
								['ChildType', childCode],
								['ParentType', parentCode],
							);
							await sandbox.connectNodes(
								// tests incoming and outgoing relationships
								[parent, 'IS_PARENT_OF', main],
								[main, 'HAS_CHILD', child],
							);
							await testPatchRequest(
								`/v2/node/MainType/${mainCode}?relationshipAction=${action}`,
								{ children: null, parents: null },
								200,
								sandbox.withMeta({
									code: mainCode,
								}),
							);

							await testNode(
								'MainType',
								mainCode,
								sandbox.withMeta({
									code: mainCode,
								}),
							);

							sandbox.expectKinesisEvents(
								[
									'UPDATE',
									mainCode,
									'MainType',
									['children', 'parents'],
								],
								[
									'UPDATE',
									childCode,
									'ChildType',
									['isChildOf'],
								],
								[
									'UPDATE',
									parentCode,
									'ParentType',
									['isParentOf'],
								],
							);
							sandbox.expectNoS3Actions(
								'upload',
								'delete',
								'patch',
							);
						});

						it('leaves other similar relationships on destination node untouched when deleting', async () => {
							const [
								main1,
								main2,
								child,
							] = await sandbox.createNodes(
								['MainType', `${mainCode}-1`],
								['MainType', `${mainCode}-2`],
								['ChildType', childCode],
							);
							await sandbox.connectNodes([
								main1,
								'HAS_CHILD',
								child,
							]);
							await sandbox.connectNodes([
								main2,
								'HAS_CHILD',
								child,
							]);

							await testPatchRequest(
								`/v2/node/MainType/${mainCode}-2?relationshipAction=${action}`,
								{
									children: null,
								},
								200,
								sandbox.withMeta({
									code: `${mainCode}-2`,
								}),
							);

							await testNode(
								'MainType',
								`${mainCode}-1`,
								sandbox.withMeta({
									code: `${mainCode}-1`,
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
											code: childCode,
										}),
									},
								],
							);

							sandbox.expectKinesisEvents(
								[
									'UPDATE',
									`${mainCode}-2`,
									'MainType',
									['children'],
								],
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

						it('leaves relationships in other direction and of other types untouched when deleting', async () => {
							const [
								main1,
								main2,
								main3,
								child,
							] = await sandbox.createNodes(
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
							await sandbox.connectNodes([
								main2,
								'HAS_YOUNGER_SIBLING',
								main3,
							]);
							await sandbox.connectNodes([
								main2,
								'HAS_CHILD',
								child,
							]);

							await testPatchRequest(
								`/v2/node/MainType/${mainCode}-2?relationshipAction=${action}`,
								{
									youngerSiblings: null,
								},
								200,
								sandbox.withMeta({
									code: `${mainCode}-2`,
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
										type: 'HAS_CHILD',
										direction: 'outgoing',
										props: sandbox.withMeta({}),
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
							sandbox.expectNoS3Actions(
								'upload',
								'delete',
								'patch',
							);
						});
					});
				}),
			);
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

	describe('diffing before writes', () => {
		it("doesn't write if no real property changes detected", async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'name-1',
			});
			const dbQuerySpy = spyDbQuery(sandbox);
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?upsert=true&relationshipAction=replace`,
				{
					someString: 'name-1',
				},
				200,
			);

			dbQuerySpy().args.forEach(args => {
				expect(args[0]).not.toMatch(/MERGE|CREATE/);
			});
			sandbox.expectNoKinesisEvents();
			sandbox.expectNoS3Actions('upload', 'delete', 'patch');
		});

		it("doesn't write if no real relationship changes detected in REPLACE mode", async () => {
			const [main, child] = await sandbox.createNodes(
				['MainType', mainCode],
				['ChildType', childCode],
			);
			await sandbox.connectNodes(main, 'HAS_CHILD', child);
			const dbQuerySpy = spyDbQuery(sandbox);
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?upsert=true&relationshipAction=replace`,
				{ children: [childCode] },
				200,
			);

			expect(
				dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0])),
			).toBe(false);
			sandbox.expectNoKinesisEvents();
			sandbox.expectNoS3Actions('upload', 'delete', 'patch');
		});

		it("doesn't write if no real relationship changes detected in MERGE mode", async () => {
			const [main, child] = await sandbox.createNodes(
				['MainType', mainCode],
				['ChildType', childCode],
			);
			await sandbox.connectNodes(main, 'HAS_CHILD', child);
			const dbQuerySpy = spyDbQuery(sandbox);
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?upsert=true&relationshipAction=merge`,
				{ children: [childCode] },
				200,
			);

			expect(
				dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0])),
			).toBe(false);
			sandbox.expectNoKinesisEvents();
			sandbox.expectNoS3Actions('upload', 'delete', 'patch');
		});

		it("doesn't write if no real lockField changes detected", async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
			});
			const dbQuerySpy = spyDbQuery(sandbox);
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?upsert=true&relationshipAction=replace`,
				{},
				200,
			);

			dbQuerySpy().args.forEach(args => {
				expect(args[0]).not.toMatch(/MERGE|CREATE/);
			});
			sandbox.expectNoKinesisEvents();
			sandbox.expectNoS3Actions('upload', 'delete', 'patch');
		});

		it('writes if property but no relationship changes detected', async () => {
			const [main, child] = await sandbox.createNodes(
				['MainType', mainCode],
				['ChildType', childCode],
			);
			await sandbox.connectNodes(main, 'HAS_CHILD', child);
			const dbQuerySpy = spyDbQuery(sandbox);
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?upsert=true&relationshipAction=merge`,
				{ someString: 'new-name', children: [childCode] },
				200,
			);

			expect(
				dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0])),
			).toBe(true);
			sandbox.expectKinesisEvents([
				'UPDATE',
				mainCode,
				'MainType',
				['someString'],
			]);
			sandbox.expectNoS3Actions('upload', 'delete', 'patch');
		});

		it('writes if relationship but no property changes detected', async () => {
			const [main, child] = await sandbox.createNodes(
				['MainType', { code: mainCode, someString: 'someString' }],
				['ChildType', `${childCode}-1`],
				['ChildType', `${childCode}-2`],
			);
			await sandbox.connectNodes(main, 'HAS_CHILD', child);
			const dbQuerySpy = spyDbQuery(sandbox);
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?upsert=true&relationshipAction=merge`,
				{ someString: 'someString', children: [`${childCode}-2`] },
				200,
			);

			expect(
				dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0])),
			).toBe(true);
			sandbox.expectKinesisEvents(
				['UPDATE', mainCode, 'MainType', ['children']],
				['UPDATE', `${childCode}-2`, 'ChildType', ['isChildOf']],
			);
			sandbox.expectNoS3Actions('upload', 'delete', 'patch');
		});

		it('detects deleted property as a change', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'someString',
			});
			const dbQuerySpy = spyDbQuery(sandbox);
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?upsert=true&relationshipAction=merge`,
				{ someString: null },
				200,
			);

			expect(
				dbQuerySpy().args.some(args => /MERGE|CREATE/.test(args[0])),
			).toBe(true);
			sandbox.expectKinesisEvents([
				'UPDATE',
				mainCode,
				'MainType',
				['someString'],
			]);
			sandbox.expectNoS3Actions('upload', 'delete', 'patch');
		});

		describe('patching with fewer relationships', () => {
			it('treats fewer relationships as a delete when replacing relationships', async () => {
				const [main, child1, child2] = await sandbox.createNodes(
					['MainType', mainCode],
					['ChildType', `${childCode}-1`],
					['ChildType', `${childCode}-2`],
				);
				await sandbox.connectNodes(
					[main, 'HAS_CHILD', child1],
					[main, 'HAS_CHILD', child2],
				);
				const dbQuerySpy = spyDbQuery(sandbox);
				await testPatchRequest(
					`/v2/node/MainType/${mainCode}?upsert=true&relationshipAction=replace`,
					{
						children: [`${childCode}-1`],
					},
					200,
				);

				expect(
					dbQuerySpy().args.some(args =>
						/MERGE|CREATE/.test(args[0]),
					),
				).toBe(true);
				sandbox.expectKinesisEvents(
					['UPDATE', mainCode, 'MainType', ['children']],
					['UPDATE', `${childCode}-2`, 'ChildType', ['isChildOf']],
				);
				sandbox.expectNoS3Actions('upload', 'delete', 'patch');
			});

			it('treats fewer relationships as no change when merging relationships', async () => {
				const [main, child1, child2] = await sandbox.createNodes(
					['MainType', mainCode],
					['ChildType', `${childCode}-1`],
					['ChildType', `${childCode}-2`],
				);
				await sandbox.connectNodes(
					[main, 'HAS_CHILD', child1],
					[main, 'HAS_CHILD', child2],
				);
				const dbQuerySpy = spyDbQuery(sandbox);
				await testPatchRequest(
					`/v2/node/MainType/${mainCode}?upsert=true&relationshipAction=merge`,
					{
						children: [`${childCode}-1`],
					},
					200,
				);

				expect(
					dbQuerySpy().args.some(args =>
						/MERGE|CREATE/.test(args[0]),
					),
				).toBe(false);
				sandbox.expectNoKinesisEvents();
				sandbox.expectNoS3Actions('upload', 'delete', 'patch');
			});
		});
	});
});

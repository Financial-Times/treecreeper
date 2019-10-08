const { postHandler } = require('..');

const {
	setupMocks,
	verifyNotExists,
	verifyExists,
} = require('../../../test-helpers');
const { securityTests } = require('../../../test-helpers/security');
const {
	dbUnavailable,
	asyncErrorFunction,
} = require('../../../test-helpers/error-stubs');

describe('rest POST', () => {
	const sandbox = {};
	const namespace = 'api-rest-post-handler';
	const mainCode = `${namespace}-main`;
	const childCode = `${namespace}-child`;
	const parentCode = `${namespace}-parent`;
	const restrictedCode = `${namespace}-restricted`;

	setupMocks(sandbox, { namespace });

	securityTests(postHandler(), mainCode);

	const input = body => ({
		type: 'MainType',
		code: mainCode,
		body,
	});

	describe('writing properties', () => {
		it('creates record with properties', async () => {
			const { status, body } = postHandler({
			})(input({ someString: 'some string' }));

			expect(status).toBe(200);
			expect(body).toEqual(
				sandbox.withCreateMeta({
					code: mainCode,
					someString: 'some string',
				}),
			);

			await testNode(
				'MainType',
				mainCode,
				sandbox.withCreateMeta({
					code: mainCode,
					someString: 'some string',
				}),
			);
		});
		it('creates record with Documents', async () => {

const { status, body } = postHandler({
				documentStore: {
					post: jest.fn(async () => ({ versionId, newBodyDocs: {
					someDocument: 'document',
				} })),
				},
			})(input({ someString: 'some string' }));

			expect(status).toBe(200);
			expect(body).toEqual(
				sandbox.withCreateMeta({
					code: mainCode,
					someString: 'some string',
				}),
			);

			await testNode(
				'MainType',
				mainCode,
				sandbox.withCreateMeta({
					code: mainCode,
					someString: 'some string',
				}),
			);



		await testPostRequest(
			`/v2/node/MainType/${mainCode}`,
			{ someString: 'some string', someDocument: 'Fake Document' },
			200,
			sandbox.withCreateMeta({
				code: mainCode,
				someString: 'some string',
				someDocument: 'Fake Document',
			}),
		);

		await testNode(
			'MainType',
			mainCode,
			sandbox.withCreateMeta({
				code: mainCode,
				someString: 'some string',
			}),
		);

		sandbox.expectS3Actions({
			action: 'upload',
			params: {
				Body: JSON.stringify({
					someDocument: 'Fake Document',
				}),
				Bucket: 'biz-ops-documents.510688331160',
				Key: `MainType/${mainCode}`,
			},
			requestType: 'POST',
		});
		sandbox.expectNoS3Actions('delete', 'patch');
	});
		it("doesn't set a property when empty string provided", async () => {});
		it("doesn't set a Document property when empty string provided", async () => {});
		it('sets Date properties', async () => {});
		it('sets Datetime properties', async () => {});
		it('sets Time properties', async () => {});
	});

	describe('generic error states', () => {
		it('throws 409 error if record already exists', async () => {});
		it('throws 400 if code in body conflicts with code in url', async () => {});
		it('throws 400 if attempting to write property not in schema', async () => {});
		it('throws if neo4j query fails', async () => {
			dbUnavailable();
			await expect(postHandler()(input)).rejects.toThrow('oh no');
		});

		it('throws if s3 query fails', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
			});
			await expect(
				postHandler({
					documentStore: {
						post: asyncErrorFunction,
					},
				})(input({ someDocument: 'some document' })),
			).rejects.toThrow('oh no');
		});

		it('undoes any s3 actions if neo4j query fails', async () => {
			const postMock = jest.fn(async () => 'post-marker');
			await sandbox.createNode('MainType', {
				code: mainCode,
			});
			dbUnavailable({ skip: 1 });
			await expect(
				postHandler({
					documentStore: {
						post: postMock,
					},
				})(input({ someDocument: 'some document' })),
			).rejects.toThrow('oh no');
			expect(postMock).toHaveBeenCalledWith(
				'MainType',
				mainCode,
				'post-marker',
			);
		});
	});
	describe('restricted types', () => {
		it('throws 400 when creating restricted record', async () => {});
		it('creates restricted record when using correct client-id', async () => {});
	});

	describe('creating relationships', () => {
		it('creates record related to existing records', async () => {});
		it('throws 400 when creating record related to non-existent records', async () => {});
		it('creates record related to non-existent records when using upsert=true', async () => {});
	});
	describe('field locking', () => {
		it('creates a record with _lockedFields', async () => {});
		it('creates a record with multiple fields, locking selective ones', async () => {});
		it('creates a record and locks all fields that are written', async () => {});
		it('throws 400 when clientId is not set', async () => {});
	});

	it('creates node with non-document properties only', async () => {});

	it('creates node with only document properties and writes to s3', async () => {
		await testPostRequest(
			`/v2/node/MainType/${mainCode}`,
			{ someDocument: 'Fake Document' },
			200,
			sandbox.withCreateMeta({
				code: mainCode,
				someDocument: 'Fake Document',
			}),
		);

		await testNode(
			'MainType',
			mainCode,
			sandbox.withCreateMeta({
				code: mainCode,
			}),
		);

		sandbox.expectS3Actions({
			action: 'upload',
			params: {
				Body: JSON.stringify({
					someDocument: 'Fake Document',
				}),
				Bucket: 'biz-ops-documents.510688331160',
				Key: `MainType/${mainCode}`,
			},
			requestType: 'POST',
		});
		sandbox.expectNoS3Actions('delete', 'patch');
	});

	it('creates node with document and non-document properties and writes to s3', async () => {
		await testPostRequest(
			`/v2/node/MainType/${mainCode}`,
			{ someString: 'some string', someDocument: 'Fake Document' },
			200,
			sandbox.withCreateMeta({
				code: mainCode,
				someString: 'some string',
				someDocument: 'Fake Document',
			}),
		);

		await testNode(
			'MainType',
			mainCode,
			sandbox.withCreateMeta({
				code: mainCode,
				someString: 'some string',
			}),
		);

		sandbox.expectS3Actions({
			action: 'upload',
			params: {
				Body: JSON.stringify({
					someDocument: 'Fake Document',
				}),
				Bucket: 'biz-ops-documents.510688331160',
				Key: `MainType/${mainCode}`,
			},
			requestType: 'POST',
		});
		sandbox.expectNoS3Actions('delete', 'patch');
	});

	it('Not create when patching non-existent restricted node', async () => {
		await testPostRequest(
			`/v2/node/RestrictedType/${restrictedCode}`,
			{ someString: 'some string' },
			400,
			new RegExp(
				`RestrictedTypes can only be created by restricted-type-creator`,
			),
		);

		verifyNotExists('RestrictedType', restrictedCode);
		sandbox.expectNoKinesisEvents();
		sandbox.expectNoS3Actions('upload', 'delete', 'patch'); // as this error will throw before s3 actions
	});

	it('Create when patching non-existent restricted node with correct client-id', async () => {
		const neo4jResult = Object.assign(
			sandbox.withCreateMeta({
				someString: 'some string',
				code: restrictedCode,
			}),
			{
				_createdByClient: 'restricted-type-creator',
				_updatedByClient: 'restricted-type-creator',
			},
		);
		const completeResult = Object.assign(
			{ someDocument: 'Fake Document' },
			neo4jResult,
		);
		await sandbox
			.request(app)
			.post(`/v2/node/RestrictedType/${restrictedCode}`)
			.set('API_KEY', process.env.API_KEY)
			.set('client-user-id', `${namespace}-user`)
			.set('x-request-id', `${namespace}-request`)
			.set('client-id', 'restricted-type-creator')
			.send({
				someString: 'some string',
				someDocument: 'Fake Document',
			})
			.expect(200, completeResult);

		await testNode('RestrictedType', restrictedCode, neo4jResult);
		sandbox.expectS3Actions({
			action: 'upload',
			params: {
				Body: JSON.stringify({
					someDocument: 'Fake Document',
				}),
				Bucket: 'biz-ops-documents.510688331160',
				Key: `RestrictedType/${restrictedCode}`,
			},
			requestType: 'POST',
		});
		sandbox.expectNoS3Actions('delete', 'patch');
	});

	it('Not set property when empty string provided', async () => {
		await testPostRequest(
			`/v2/node/MainType/${mainCode}`,
			{ someString: 'some string', anotherString: '' },
			200,
			sandbox.withCreateMeta({
				code: mainCode,
				someString: 'some string',
			}),
		);

		await testNode(
			'MainType',
			mainCode,
			sandbox.withCreateMeta({
				code: mainCode,
				someString: 'some string',
			}),
		);
	});

	it.skip('Set DateTime property', async () => {});
	it.skip('Set Time property', async () => {});

	// TODO - once we have a test schema, need to test other temporal types
	it('Set Date property', async () => {
		const isoDateString = '2019-01-09';
		const date = new Date(isoDateString);
		await testPostRequest(
			`/v2/node/MainType/${mainCode}`,
			{ someDate: date.toISOString() },
			200,
			sandbox.withCreateMeta({
				code: mainCode,
				someDate: isoDateString,
			}),
		);

		await testNode(
			'MainType',
			mainCode,
			sandbox.withCreateMeta({
				code: mainCode,
				someDate: isoDateString,
			}),
		);
	});

	it('error when creating duplicate node', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
		});
		await testPostRequest(
			`/v2/node/MainType/${mainCode}`,
			{
				someDocument: 'Fake Document',
			},
			409,
			new RegExp(`MainType ${mainCode} already exists`),
		);
		sandbox.expectNoKinesisEvents();
		sandbox.expectS3Actions(
			{
				action: 'upload',
				params: {
					Body: JSON.stringify({ someDocument: 'Fake Document' }),
					Bucket: 'biz-ops-documents.510688331160',
					Key: `MainType/${mainCode}`,
				},
				requestType: 'POST',
			},
			{
				action: 'delete',
				nodeType: 'MainType',
				code: mainCode,
				versionId: 'FakeVersionId',
			},
		);
		sandbox.expectNoS3Actions('patch');
	});

	it('error when conflicting code values', async () => {
		const wrongCode = 'wrong-code';
		await testPostRequest(
			`/v2/node/MainType/${mainCode}`,
			{ code: wrongCode, someDocument: 'Fake Document' },
			400,
			new RegExp(
				`Conflicting code property \`wrong-code\` in payload for MainType ${mainCode}`,
			),
		);
		sandbox.expectNoKinesisEvents();
		await verifyNotExists('MainType', mainCode);
		sandbox.expectNoS3Actions('upload', 'patch', 'delete'); // as this error will throw before s3 actions
	});

	it('error when unrecognised property', async () => {
		await testPostRequest(
			`/v2/node/MainType/${mainCode}`,
			{ notInSchema: 'unrecognised' },
			400,
			/Invalid property `notInSchema` on type `MainType`/,
		);
		expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
		await verifyNotExists('MainType', mainCode);
		sandbox.expectNoS3Actions('upload', 'delete', 'patch'); // as this error will throw before s3 actions
	});

	it('create node related to existing nodes', async () => {
		await sandbox.createNodes(
			['ChildType', childCode],
			['ParentType', parentCode],
		);
		await testPostRequest(
			`/v2/node/MainType/${mainCode}`,
			{
				children: [childCode],
				parents: [parentCode],
			},
			200,
			sandbox.withCreateMeta({
				code: mainCode,
				children: [childCode],
				parents: [parentCode],
			}),
		);

		await testNode(
			'MainType',
			mainCode,
			sandbox.withCreateMeta({
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
			[
				{
					type: 'IS_PARENT_OF',
					direction: 'incoming',
					props: sandbox.withCreateMeta({}),
				},
				{
					type: 'ParentType',
					props: sandbox.withMeta({ code: parentCode }),
				},
			],
		);

		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it.skip('sends events for recursive fields', () => {
		// for the time being don't have any of them defined or used in new tests
	});

	it('error when creating node related to non-existent nodes', async () => {
		await testPostRequest(
			`/v2/node/MainType/${mainCode}`,
			{
				children: [childCode],
				parents: [parentCode],
			},
			400,
			/Missing related node/,
		);
		sandbox.expectNoKinesisEvents();
		await verifyNotExists('MainType', mainCode);
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it('create node related to non-existent nodes when using upsert=true', async () => {
		await testPostRequest(
			`/v2/node/MainType/${mainCode}?upsert=true`,
			{
				children: [childCode],
				parents: [parentCode],
			},
			200,
			sandbox.withCreateMeta({
				code: mainCode,
				children: [childCode],
				parents: [parentCode],
			}),
		);

		await testNode(
			'MainType',
			mainCode,
			sandbox.withCreateMeta({
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
					props: sandbox.withCreateMeta({ code: childCode }),
				},
			],
			[
				{
					type: 'IS_PARENT_OF',
					direction: 'incoming',
					props: sandbox.withCreateMeta({}),
				},
				{
					type: 'ParentType',
					props: sandbox.withCreateMeta({ code: parentCode }),
				},
			],
		);

		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	describe('locked Fields', () => {
		it('creates a node with _lockedFields', async () => {
			await testPostRequest(
				`/v2/node/MainType/${mainCode}?lockFields=someString`,
				{ someString: 'some string' },
				200,
				sandbox.withCreateMeta({
					code: 'v2-node-post-main',
					someString: 'some string',
					_lockedFields: '{"someString":"v2-node-post-client"}',
				}),
			);
		});

		it('creates a node with multiple fields, locking selective ones', async () => {
			await testPostRequest(
				`/v2/node/MainType/${mainCode}?lockFields=someString`,
				{
					someString: 'some string',
					anotherString: 'another string innit',
				},
				200,
				sandbox.withCreateMeta({
					code: 'v2-node-post-main',
					someString: 'some string',
					anotherString: 'another string innit',
					_lockedFields: '{"someString":"v2-node-post-client"}',
				}),
			);
		});

		it('creates a node and locks ALL fields that are written', async () => {
			await testPostRequest(
				`/v2/node/MainType/${mainCode}?lockFields=all`,
				{ someString: 'some string' },
				200,
				sandbox.withCreateMeta({
					code: 'v2-node-post-main',
					someString: 'some string',
					_lockedFields: '{"someString":"v2-node-post-client"}',
				}),
			);
		});

		describe('no client-id header', () => {
			setupMocks(sandbox, { namespace }, false);

			it('throws an error when clientId is not set', async () => {
				await testPostRequest(
					`/v2/node/MainType/${mainCode}?lockFields=all`,
					{
						someString: 'some string',
						someDocument: 'Fake Document',
					},
					400,
					/clientId needs to be set to a valid system code in order to lock fields/,
				);
				sandbox.expectNoS3Actions('upload', 'delete', 'patch'); // mergeLockedFields throws an error before s3 actions
			});
		});
	});
});

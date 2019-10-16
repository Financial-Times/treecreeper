const app = require('../../server/app.js');

const {
	setupMocks,
	stubDbUnavailable,
	stubS3Unavailable,
	testNode,
	verifyNotExists,
} = require('../helpers');

describe('v2 - node POST', () => {
	const sandbox = {};
	const namespace = 'v2-node-post';

	const mainCode = `${namespace}-main`;
	const childCode = `${namespace}-child`;
	const parentCode = `${namespace}-parent`;
	const restrictedCode = `${namespace}-restricted`;

	setupMocks(sandbox, { namespace });

	const testPostRequest = (url, data, ...expectations) =>
		sandbox
			.request(app)
			.post(url)
			.namespacedAuth()
			.send(data)
			.expect(...expectations);

	it('responds with 500 if neo4j query fails', async () => {
		stubDbUnavailable(sandbox);
		await testPostRequest(
			`/v2/node/MainType/${mainCode}`,
			{
				someString: 'name1',
				someDocument: 'Fake Document',
			},
			500,
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

	it('responds with 500 if s3 query fails', async () => {
		stubS3Unavailable(sandbox);
		await testPostRequest(
			`/v2/node/MainType/${mainCode}`,
			{ someString: 'name1', someDocument: 'Fake Document' },
			500,
		);
		sandbox.expectNoKinesisEvents();
		// S3DocumentsHelper throws on instantiation
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it('creates node with non-document properties only', async () => {
		await testPostRequest(
			`/v2/node/MainType/${mainCode}`,
			{ someString: 'name1' },
			200,
			sandbox.withCreateMeta({
				code: mainCode,
				someString: 'name1',
			}),
		);

		await testNode(
			'MainType',
			mainCode,
			sandbox.withCreateMeta({
				code: mainCode,
				someString: 'name1',
			}),
		);
		sandbox.expectKinesisEvents([
			'CREATE',
			mainCode,
			'MainType',
			['code', 'someString'],
		]);
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

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
		sandbox.expectKinesisEvents([
			'CREATE',
			mainCode,
			'MainType',
			['code', 'someDocument'],
		]);

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
			{ someString: 'name1', someDocument: 'Fake Document' },
			200,
			sandbox.withCreateMeta({
				code: mainCode,
				someString: 'name1',
				someDocument: 'Fake Document',
			}),
		);

		await testNode(
			'MainType',
			mainCode,
			sandbox.withCreateMeta({
				code: mainCode,
				someString: 'name1',
			}),
		);
		sandbox.expectKinesisEvents([
			'CREATE',
			mainCode,
			'MainType',
			['code', 'someString', 'someDocument'],
		]);

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
			{ someString: 'name1' },
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
				someString: 'name1',
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
				someString: 'name1',
				someDocument: 'Fake Document',
			})
			.expect(200, completeResult);

		await testNode('RestrictedType', restrictedCode, neo4jResult);
		sandbox.expectKinesisEvents([
			'CREATE',
			restrictedCode,
			'RestrictedType',
			['someString', 'code', 'someDocument'],
			'restricted-type-creator',
		]);
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
			{ someString: 'name1', anotherString: '' },
			200,
			sandbox.withCreateMeta({
				code: mainCode,
				someString: 'name1',
			}),
		);

		await testNode(
			'MainType',
			mainCode,
			sandbox.withCreateMeta({
				code: mainCode,
				someString: 'name1',
			}),
		);
		sandbox.expectKinesisEvents([
			'CREATE',
			mainCode,
			'MainType',
			['code', 'someString'],
		]);
	});

	it.skip('Not set Document property when empty string provided', async () => {
		// TODO need to write a test here
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
		sandbox.expectKinesisEvents([
			'CREATE',
			mainCode,
			'MainType',
			['code', 'someDate'],
		]);
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

		sandbox.expectKinesisEvents(
			['CREATE', mainCode, 'MainType', ['code', 'children', 'parents']],
			['UPDATE', childCode, 'ChildType', ['isChildOf']],
			['UPDATE', parentCode, 'ParentType', ['isParentOf']],
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

		sandbox.expectKinesisEvents(
			['CREATE', mainCode, 'MainType', ['code', 'children', 'parents']],
			['CREATE', childCode, 'ChildType', ['code', 'isChildOf']],
			['CREATE', parentCode, 'ParentType', ['code', 'isParentOf']],
		);
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	describe('locked Fields', () => {
		it('creates a node with _lockedFields', async () => {
			await testPostRequest(
				`/v2/node/MainType/${mainCode}?lockFields=someString`,
				{ someString: 'name1' },
				200,
				sandbox.withCreateMeta({
					code: 'v2-node-post-main',
					someString: 'name1',
					_lockedFields: '{"someString":"v2-node-post-client"}',
				}),
			);
		});

		it('creates a node with multiple fields, locking selective ones', async () => {
			await testPostRequest(
				`/v2/node/MainType/${mainCode}?lockFields=someString`,
				{ someString: 'name1', anotherString: 'another string innit' },
				200,
				sandbox.withCreateMeta({
					code: 'v2-node-post-main',
					someString: 'name1',
					anotherString: 'another string innit',
					_lockedFields: '{"someString":"v2-node-post-client"}',
				}),
			);
		});

		it('creates a node and locks ALL fields that are written', async () => {
			await testPostRequest(
				`/v2/node/MainType/${mainCode}?lockFields=all`,
				{ someString: 'name1' },
				200,
				sandbox.withCreateMeta({
					code: 'v2-node-post-main',
					someString: 'name1',
					_lockedFields: '{"someString":"v2-node-post-client"}',
				}),
			);
		});

		describe('no client-id header', () => {
			setupMocks(sandbox, { namespace }, false);

			it('throws an error when clientId is not set', async () => {
				await testPostRequest(
					`/v2/node/MainType/${mainCode}?lockFields=all`,
					{ someString: 'name1', someDocument: 'Fake Document' },
					400,
					/clientId needs to be set to a valid system code in order to lock fields/,
				);
				sandbox.expectNoS3Actions('upload', 'delete', 'patch'); // mergeLockedFields throws an error before s3 actions
			});
		});
	});
});

const createApp = require('../../server/create-app.js');

let app;

const {
	setupMocks,
	stubDbUnavailable,
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
	beforeAll(async () => {
		app = await createApp();
	});
	const testPostRequest = (url, data, ...expectations) => {
		if (expectations[1] && expectations[1].children) {
			expectations[1].deprecatedChildren = expectations[1].children;
		}
		return sandbox
			.request(app)
			.post(url)
			.namespacedAuth()
			.send(data)
			.expect(...expectations);
	};

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
		await sandbox
			.request(app)
			.post(`/v2/node/RestrictedType/${restrictedCode}`)
			.set('API_KEY', process.env.API_KEY)
			.set('client-user-id', `${namespace}-user`)
			.set('x-request-id', `${namespace}-request`)
			.set('client-id', 'restricted-type-creator')
			.send({
				someString: 'name1',
			})
			.expect(200, neo4jResult);

		await testNode('RestrictedType', restrictedCode, neo4jResult);
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
	});

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

		await verifyNotExists('MainType', mainCode);
	});

	it('error when unrecognised property', async () => {
		await testPostRequest(
			`/v2/node/MainType/${mainCode}`,
			{ notInSchema: 'unrecognised' },
			400,
			/Invalid property `notInSchema` on type `MainType`/,
		);

		await verifyNotExists('MainType', mainCode);
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

		await verifyNotExists('MainType', mainCode);
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
			});
		});
	});
});

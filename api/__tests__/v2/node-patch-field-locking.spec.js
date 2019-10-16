const app = require('../../server/app.js');

const { setupMocks, spyDbQuery } = require('../helpers');

describe('v2 - node PATCH - field locking', () => {
	const sandbox = {};
	const namespace = 'v2-node-locking';

	const mainCode = `${namespace}-main`;

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

	describe('lockedFields', () => {
		const lockedFieldName = '{"someString":"v2-node-locking-client"}';
		const lockedFieldEmail = '{"anotherString":"v2-node-locking-client"}';

		it('throws an error when trying to write a field that is locked by another clientId', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'old someString',
				_lockedFields: '{"someString":"admin"}',
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}`,
				{
					someString: 'new someString',
				},
				400,
			);
		});

		it('writes a field that is unlocked', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'old someString',
				_lockedFields: '{"someString":"admin"}',
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}`,
				{
					anotherString: 'okey dokey',
				},
				200,
				sandbox.withMeta({
					code: mainCode,
					someString: 'old someString',
					anotherString: 'okey dokey',
					_lockedFields: '{"someString":"admin"}',
				}),
			);
		});

		it('writes a field that is locked by the same clientId', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'old someString',
				_lockedFields: lockedFieldName,
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}`,
				{
					someString: 'new someString',
				},
				200,
				sandbox.withMeta({
					code: mainCode,
					someString: 'new someString',
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it('throws an error when trying to lock a field that is locked by another clientId', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				_lockedFields: '{"someString":"admin"}',
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?lockFields=someString`,
				{
					description: 'not relevant to the test',
				},
				400,
			);
		});

		it('updates node by updating field and locking ALL edited fields', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'someString 1',
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?lockFields=all`,
				{
					someString: 'new someString',
				},
				200,
				sandbox.withMeta({
					code: mainCode,
					someString: 'new someString',
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it('updates node by updating someString and adding it as a locked field', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'someString 1',
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?lockFields=someString`,
				{
					someString: 'new someString',
				},
				200,
				sandbox.withMeta({
					code: mainCode,
					someString: 'new someString',
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it('updates node that is locked by this clientId', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'someString 1',
				_lockedFields: lockedFieldName,
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?lockFields=someString`,
				{
					someString: 'new someString',
				},
				200,
				sandbox.withMeta({
					code: mainCode,
					someString: 'new someString',
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it('does NOT update node with locked field when it is has already locked it (no duplicates)', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'someString 1',
				_lockedFields: lockedFieldEmail,
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?lockFields=anotherString`,
				{
					someString: 'new someString',
				},
				200,
				sandbox.withMeta({
					code: mainCode,
					someString: 'new someString',
					_lockedFields: lockedFieldEmail,
				}),
			);
		});

		it('adds another field to locked fields', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'someString 1',
				_lockedFields: lockedFieldEmail,
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?lockFields=someString`,
				{
					someString: 'new someString',
				},
				200,
				sandbox.withMeta({
					code: mainCode,
					someString: 'new someString',
					_lockedFields:
						'{"anotherString":"v2-node-locking-client","someString":"v2-node-locking-client"}',
				}),
			);
		});

		it('does NOT lock existing fields when those fields are locked by another clientId', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'someString 1',
				_lockedFields: lockedFieldEmail,
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?lockFields=anotherString`,
				{
					someString: 'new someString',
				},
				200,
				sandbox.withMeta({
					code: mainCode,
					someString: 'new someString',
					_lockedFields: lockedFieldEmail,
				}),
			);
		});

		it('does NOT modify lock fields when just updating locked and unlocked fields', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'someString 1',
				anotherString: 'anotherString',
				_lockedFields: lockedFieldName,
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}`,
				{
					someString: 'new someString',
					anotherString: 'a new other string',
				},
				200,
				sandbox.withMeta({
					code: mainCode,
					someString: 'new someString',
					anotherString: 'a new other string',
					_lockedFields: '{"someString":"v2-node-locking-client"}',
				}),
			);
		});

		it('only locks fields that are given in the query but updates all fields', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'someString 1',
				anotherString: 'anotherString',
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?lockFields=someString`,
				{
					someString: 'new someString',
					anotherString: 'a new other string',
				},
				200,
				sandbox.withMeta({
					code: mainCode,
					someString: 'new someString',
					anotherString: 'a new other string',
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it('creates a new node with locked fields when no exisitng node exists', async () => {
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?lockFields=someString`,
				{
					someString: 'new someString',
					anotherString: 'a new other string',
				},
				201,
				sandbox.withCreateMeta({
					code: mainCode,
					someString: 'new someString',
					anotherString: 'a new other string',
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it('does NOT overwrite existing locked fields when lockFields=all is set', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'someString 1',
				_lockedFields: '{"someString":"another-api"}',
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?lockFields=all`,
				{
					someString: 'new someString',
				},
				400,
				/The following fields cannot be locked because they are locked by another client: someString is locked by another-api/,
			);
		});

		it('can lock fields without having to send any data changes', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?lockFields=someString`,
				null,
				200,
				sandbox.withMeta({
					code: mainCode,
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it('can lock fields when sending values that make no changes', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'someString 1',
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?lockFields=someString`,
				null,
				200,
				sandbox.withMeta({
					code: mainCode,
					someString: 'someString 1',
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it("doesn't write when 'changing order' of locked fields", async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'someString 1',
				_lockedFields:
					'{"someString":"v2-node-locking-client","description":"other-client","anotherString":"v2-node-locking-client"}',
			});

			const dbQuerySpy = spyDbQuery(sandbox);

			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?lockFields=anotherString,someString`,
				null,
				200,
				sandbox.withMeta({
					code: mainCode,
					someString: 'someString 1',
					_lockedFields:
						'{"someString":"v2-node-locking-client","description":"other-client","anotherString":"v2-node-locking-client"}',
				}),
			);

			dbQuerySpy().args.forEach(args => {
				expect(args[0]).not.toMatch(/MERGE|CREATE/);
			});
		});

		describe('no client-id header', () => {
			setupMocks(sandbox, { namespace }, false);

			it('throws an error when clientId is not set', async () => {
				await sandbox
					.request(app)
					.post(`/v2/node/MainType/${mainCode}?lockFields=all`)
					.namespacedAuth()
					.send({ someString: 'name1' })
					.expect(
						400,
						/clientId needs to be set to a valid system code in order to lock fields/,
					);
			});
		});
	});

	describe('unlocking fields', () => {
		it('unlocks fields when request is given', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'someString 1',
				_lockedFields: '{"anotherString":"v2-node-locking-client"}',
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?unlockFields=anotherString`,
				{
					someString: 'new someString',
				},
				200,
				sandbox.withMeta({
					code: mainCode,
					someString: 'new someString',
				}),
			);
		});

		it('unlocks fields when request is given by a different clientId that locked it', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'someString 1',
				_lockedFields: '{"anotherString":"another-api"}',
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?unlockFields=anotherString`,
				{
					someString: 'new someString',
				},
				200,
				sandbox.withMeta({
					code: mainCode,
					someString: 'new someString',
				}),
			);
		});

		it('unlocks `all` fields', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'someString 1',
				_lockedFields: `{"code":"v2-node-locking-client","someString":"v2-node-locking-client"}`,
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?unlockFields=all`,
				{
					someString: 'new someString',
				},
				200,
				sandbox.withMeta({
					code: mainCode,
					someString: 'new someString',
				}),
			);
		});

		it('unlocks the locked field when value sent make no changes', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'someString 1',
				_lockedFields: `{"someString":"v2-node-locking-client"}`,
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?unlockFields=someString`,
				null,
				200,
				sandbox.withMeta({
					code: mainCode,
					someString: 'someString 1',
				}),
			);
		});

		it('unlocks a locked field and writes new value in same request', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'someString 1',
				_lockedFields: `{"someString":"v2-node-locking-client2"}`,
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?unlockFields=someString`,
				{ someString: 'someString 2' },
				200,
				sandbox.withMeta({
					code: mainCode,
					someString: 'someString 2',
				}),
			);
		});

		it('unlocks a locked field and writes new locked value in same request', async () => {
			await sandbox.createNode('MainType', {
				code: mainCode,
				someString: 'someString 1',
				_lockedFields: `{"someString":"v2-node-locking-client"}`,
			});
			await testPatchRequest(
				`/v2/node/MainType/${mainCode}?unlockFields=someString&lockFields=someString`,
				{ someString: 'someString 2' },
				200,
				sandbox.withMeta({
					code: mainCode,
					someString: 'someString 2',
					_lockedFields: `{"someString":"v2-node-locking-client"}`,
				}),
			);
		});

		describe('no value changes', () => {
			it('unlocks `all` fields', async () => {
				await sandbox.createNode('MainType', {
					code: mainCode,
					_lockedFields: `{"code":"v2-node-locking-client","someString":"v2-node-locking-client"}`,
				});
				await testPatchRequest(
					`/v2/node/MainType/${mainCode}?unlockFields=all`,
					null,
					200,
					sandbox.withMeta({
						code: mainCode,
					}),
				);
			});

			it('unlocks the only locked field', async () => {
				await sandbox.createNode('MainType', {
					code: mainCode,
					_lockedFields: `{"someString":"v2-node-locking-client"}`,
				});
				await testPatchRequest(
					`/v2/node/MainType/${mainCode}?unlockFields=someString`,
					null,
					200,
					sandbox.withMeta({
						code: mainCode,
					}),
				);
			});
		});
	});
});

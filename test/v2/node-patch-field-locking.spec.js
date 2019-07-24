const app = require('../../server/app.js');

const { setupMocks, spyDbQuery } = require('../helpers');

describe('v2 - node PATCH - field locking', () => {
	const sandbox = {};
	const namespace = 'v2-node-locking';

	const teamCode = `${namespace}-team`;

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
		const lockedFieldName = '{"name":"v2-node-locking-client"}';
		const lockedFieldEmail = '{"email":"v2-node-locking-client"}';
		it('throws an error when trying to update a node that is locked by another clientId', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				_lockedFields: '{"name":"admin"}',
			});
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?lockFields=name`,
				{
					name: 'new name',
				},
				400,
			);
		});

		it('updates node by updating field and locking ALL edited fields', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
			});
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?lockFields=all`,
				{
					name: 'new name',
				},
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it('updates node by updating name and adding it as a locked field', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
			});
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?lockFields=name`,
				{
					name: 'new name',
				},
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it('updates node that is locked by this clientId', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: lockedFieldName,
			});
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?lockFields=name`,
				{
					name: 'new name',
				},
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it('does NOT update node with locked field when it is has already locked it (no duplicates)', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: lockedFieldEmail,
			});
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?lockFields=email`,
				{
					name: 'new name',
				},
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
					_lockedFields: lockedFieldEmail,
				}),
			);
		});

		it('adds another field to locked fields', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: lockedFieldEmail,
			});
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?lockFields=name`,
				{
					name: 'new name',
				},
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
					_lockedFields:
						'{"email":"v2-node-locking-client","name":"v2-node-locking-client"}',
				}),
			);
		});

		it('does NOT lock existing fields when those fields are locked by another clientId', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: lockedFieldEmail,
			});
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?lockFields=email`,
				{
					name: 'new name',
				},
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
					_lockedFields: lockedFieldEmail,
				}),
			);
		});

		it('does NOT modify lock fields when just updating locked and unlocked fields', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				email: 'email@example.com',
				slack: 'slack channel',
				_lockedFields: lockedFieldName,
			});
			await testPatchRequest(
				`/v2/node/Team/${teamCode}`,
				{
					name: 'new name',
					email: 'tech@lt.com',
					slack: 'new slack channel',
				},
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
					email: 'tech@lt.com',
					slack: 'new slack channel',
					_lockedFields: '{"name":"v2-node-locking-client"}',
				}),
			);
		});

		it('only locks fields that are given in the query but updates all fields', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				email: 'email@example.com',
				slack: 'slack channel',
			});
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?lockFields=name`,
				{
					name: 'new name',
					email: 'tech@lt.com',
					slack: 'new slack channel',
				},
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
					email: 'tech@lt.com',
					slack: 'new slack channel',
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it('creates a new node with locked fields when no exisitng node exists', async () => {
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?lockFields=name`,
				{
					name: 'new name',
					email: 'tech@lt.com',
					slack: 'new slack channel',
				},
				201,
				sandbox.withCreateMeta({
					code: teamCode,
					name: 'new name',
					email: 'tech@lt.com',
					slack: 'new slack channel',
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it('does NOT overwrite existing locked fields when lockFields=all is set', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: '{"name":"another-api"}',
			});
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?lockFields=all`,
				{
					name: 'new name',
				},
				400,
				/The following fields cannot be updated because they are locked by another client: name is locked by another-api/,
			);
		});

		it('can lock fields without having to send any data changes', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
			});
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?lockFields=name`,
				null,
				200,
				sandbox.withMeta({
					code: teamCode,
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it('can lock fields when sending values that make no changes', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
			});
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?lockFields=name`,
				null,
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'name 1',
					_lockedFields: lockedFieldName,
				}),
			);
		});

		it("doesn't write when 'changing order' of locked fields", async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields:
					'{"name":"v2-node-locking-client","description":"other-client","email":"v2-node-locking-client"}',
			});

			const dbQuerySpy = spyDbQuery(sandbox);

			await testPatchRequest(
				`/v2/node/Team/${teamCode}?lockFields=email,name`,
				null,
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'name 1',
					_lockedFields:
						'{"name":"v2-node-locking-client","description":"other-client","email":"v2-node-locking-client"}',
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
					.post(`/v2/node/Team/${teamCode}?lockFields=all`)
					.namespacedAuth()
					.send({ name: 'name1' })
					.expect(
						400,
						/clientId needs to be set to a valid system code in order to lock fields/,
					);
			});
		});
	});

	describe('unlocking fields', () => {
		it('unlocks fields when request is given', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: '{"email":"v2-node-locking-client"}',
			});
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?unlockFields=email`,
				{
					name: 'new name',
				},
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
				}),
			);
		});

		it('unlocks fields when request is given by a different clientId that locked it', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: '{"email":"another-api"}',
			});
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?unlockFields=email`,
				{
					name: 'new name',
				},
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
				}),
			);
		});

		it('unlocks `all` fields', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: `{"code":"v2-node-locking-client","name":"v2-node-locking-client"}`,
			});
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?unlockFields=all`,
				{
					name: 'new name',
				},
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'new name',
				}),
			);
		});

		it('unlocks the locked field when value sent make no changes', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: `{"name":"v2-node-locking-client"}`,
			});
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?unlockFields=name`,
				null,
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'name 1',
				}),
			);
		});

		it('unlocks a locked field and writes new value in same request', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: `{"name":"v2-node-locking-client2"}`,
			});
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?unlockFields=name`,
				{ name: 'name 2' },
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'name 2',
				}),
			);
		});

		it('unlocks a locked field and writes new locked value in same request', async () => {
			await sandbox.createNode('Team', {
				code: teamCode,
				name: 'name 1',
				_lockedFields: `{"name":"v2-node-locking-client"}`,
			});
			await testPatchRequest(
				`/v2/node/Team/${teamCode}?unlockFields=name&lockFields=name`,
				{ name: 'name 2' },
				200,
				sandbox.withMeta({
					code: teamCode,
					name: 'name 2',
					_lockedFields: `{"name":"v2-node-locking-client"}`,
				}),
			);
		});

		describe('no value changes', () => {
			it('unlocks `all` fields', async () => {
				await sandbox.createNode('Team', {
					code: teamCode,
					_lockedFields: `{"code":"v2-node-locking-client","name":"v2-node-locking-client"}`,
				});
				await testPatchRequest(
					`/v2/node/Team/${teamCode}?unlockFields=all`,
					null,
					200,
					sandbox.withMeta({
						code: teamCode,
					}),
				);
			});

			it('unlocks the only locked field', async () => {
				await sandbox.createNode('Team', {
					code: teamCode,
					_lockedFields: `{"name":"v2-node-locking-client"}`,
				});
				await testPatchRequest(
					`/v2/node/Team/${teamCode}?unlockFields=name`,
					null,
					200,
					sandbox.withMeta({
						code: teamCode,
					}),
				);
			});
		});
	});
});

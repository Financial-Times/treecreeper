const app = require('../../server/app.js');

const {
	setupMocks,
	stubDbUnavailable,
	stubS3Unavailable,
	testNode,
	verifyNotExists,
	verifyExists,
} = require('../helpers');

describe('v2 - node POST', () => {
	const sandbox = {};
	const namespace = 'v2-node-post';

	const teamCode = `${namespace}-team`;
	const personCode = `${namespace}-person`;
	const groupCode = `${namespace}-group`;
	const systemCode = `${namespace}-group`;
	const repoCode = `github:${namespace}`;

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
		await testPostRequest(`/v2/node/Team/${teamCode}`, {}, 500);
		sandbox.expectNoKinesisEvents();
		sandbox.expectS3Actions([
			{
				action: 'upload',
				params: {
					Body: JSON.stringify({ code: teamCode }),
					Bucket: 'biz-ops-documents.510688331160',
					Key: `Team/${teamCode}`,
				},
				requestType: 'POST',
			},
			{
				action: 'delete',
				nodeType: 'Team',
				code: teamCode,
			},
		]);
	});

	it('responds with 500 if s3 query fails', async () => {
		stubS3Unavailable(sandbox);
		await testPostRequest(`/v2/node/Team/${teamCode}`, {}, 500);
		sandbox.expectNoKinesisEvents();
		sandbox.expectNoS3Actions();
	});

	it('creates node and writes to s3', async () => {
		await testPostRequest(
			`/v2/node/Team/${teamCode}`,
			{ name: 'name1' },
			200,
			sandbox.withCreateMeta({
				code: teamCode,
				name: 'name1',
			}),
		);

		await testNode(
			'Team',
			teamCode,
			sandbox.withCreateMeta({
				code: teamCode,
				name: 'name1',
			}),
		);
		sandbox.expectKinesisEvents([
			'CREATE',
			teamCode,
			'Team',
			['code', 'name'],
		]);

		sandbox.expectS3Actions([
			{
				action: 'upload',
				params: {
					Body: JSON.stringify({ code: teamCode }),
					Bucket: 'biz-ops-documents.510688331160',
					Key: `Team/${teamCode}`,
				},
				requestType: 'POST',
			},
		]);
	});

	it('Not create when patching non-existent restricted node', async () => {
		await testPostRequest(
			`/v2/node/Repository/${repoCode}`,
			{ name: 'name1' },
			400,
			new RegExp(
				`Repositories can only be created by biz-ops-github-importer`,
			),
		);

		verifyNotExists('Repository', repoCode);
		sandbox.expectNoKinesisEvents();
	});

	it('Create when patching non-existent restricted node with correct client-id', async () => {
		const result = Object.assign(
			sandbox.withCreateMeta({
				name: 'name1',
				code: repoCode,
			}),
			{
				_createdByClient: 'biz-ops-github-importer',
				_updatedByClient: 'biz-ops-github-importer',
			},
		);
		await sandbox
			.request(app)
			.post(`/v2/node/Repository/${repoCode}`)
			.set('API_KEY', process.env.API_KEY)
			.set('client-user-id', `${namespace}-user`)
			.set('x-request-id', `${namespace}-request`)
			.set('client-id', 'biz-ops-github-importer')
			.send({
				name: 'name1',
			})
			.expect(200, result);

		await testNode('Repository', repoCode, result);
		sandbox.expectKinesisEvents([
			'CREATE',
			repoCode,
			'Repository',
			['name', 'code'],
			'biz-ops-github-importer',
		]);
	});

	it('Not set property when empty string provided', async () => {
		await testPostRequest(
			`/v2/node/Team/${teamCode}`,
			{ name: 'name1', description: '' },
			200,
			sandbox.withCreateMeta({
				code: teamCode,
				name: 'name1',
			}),
		);

		await testNode(
			'Team',
			teamCode,
			sandbox.withCreateMeta({
				code: teamCode,
				name: 'name1',
			}),
		);
		sandbox.expectKinesisEvents([
			'CREATE',
			teamCode,
			'Team',
			['code', 'name'],
		]);
	});

	// TODO - once we have a test schema, need to test other temporal types
	it('Set Date property', async () => {
		const isoDateString = '2019-01-09';
		const date = new Date(isoDateString);
		await testPostRequest(
			`/v2/node/System/${systemCode}`,
			{ lastServiceReviewDate: date.toISOString() },
			200,
			sandbox.withCreateMeta({
				code: systemCode,
				lastServiceReviewDate: isoDateString,
			}),
		);

		await testNode(
			'System',
			systemCode,
			sandbox.withCreateMeta({
				code: systemCode,
				lastServiceReviewDate: isoDateString,
			}),
		);
		sandbox.expectKinesisEvents([
			'CREATE',
			systemCode,
			'System',
			['code', 'lastServiceReviewDate'],
		]);
	});

	it('error when creating duplicate node', async () => {
		await sandbox.createNode('Team', {
			code: teamCode,
		});
		await testPostRequest(
			`/v2/node/Team/${teamCode}`,
			{},
			409,
			new RegExp(`Team ${teamCode} already exists`),
		);
		sandbox.expectNoKinesisEvents();
	});

	it('error when conflicting code values', async () => {
		await testPostRequest(
			`/v2/node/Team/${teamCode}`,
			{ code: 'wrong-code' },
			400,
			new RegExp(
				`Conflicting code property \`wrong-code\` in payload for Team ${teamCode}`,
			),
		);
		sandbox.expectNoKinesisEvents();
		await verifyNotExists('Team', teamCode);
	});

	it('error when unrecognised property', async () => {
		await testPostRequest(
			`/v2/node/Team/${teamCode}`,
			{ foo: 'unrecognised' },
			400,
			/Invalid property `foo` on type `Team`/,
		);
		expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
		await verifyNotExists('Team', teamCode);
	});

	it('not error when non-conflicting code values', async () => {
		await testPostRequest(
			`/v2/node/Team/${teamCode}`,
			{ code: teamCode },
			200,
		);
		sandbox.expectKinesisEvents(['CREATE', teamCode, 'Team', ['code']]);
		await verifyExists('Team', teamCode);
	});

	it('create node related to existing nodes', async () => {
		await sandbox.createNodes(['Person', personCode], ['Group', groupCode]);
		await testPostRequest(
			`/v2/node/Team/${teamCode}`,
			{
				techLeads: [personCode],
				parentGroup: groupCode,
			},
			200,
			sandbox.withCreateMeta({
				code: teamCode,
				techLeads: [personCode],
				parentGroup: groupCode,
			}),
		);

		await testNode(
			'Team',
			teamCode,
			sandbox.withCreateMeta({
				code: teamCode,
			}),
			[
				{
					type: 'HAS_TECH_LEAD',
					direction: 'outgoing',
					props: sandbox.withCreateMeta({}),
				},
				{
					type: 'Person',
					props: sandbox.withMeta({ code: personCode }),
				},
			],
			[
				{
					type: 'HAS_TEAM',
					direction: 'incoming',
					props: sandbox.withCreateMeta({}),
				},
				{
					type: 'Group',
					props: sandbox.withMeta({ code: groupCode }),
				},
			],
		);

		sandbox.expectKinesisEvents(
			[
				'CREATE',
				teamCode,
				'Team',
				['code', 'techLeads', 'parentGroup', 'group'],
			],
			['UPDATE', personCode, 'Person', ['techLeadFor']],
			['UPDATE', groupCode, 'Group', ['allTeams', 'topLevelTeams']],
		);
	});

	it('error when creating node related to non-existent nodes', async () => {
		await testPostRequest(
			`/v2/node/Team/${teamCode}`,
			{
				techLeads: [personCode],
				parentGroup: groupCode,
			},
			400,
			/Missing related node/,
		);
		sandbox.expectNoKinesisEvents();
		await verifyNotExists('Team', teamCode);
	});

	it('create node related to non-existent nodes when using upsert=true', async () => {
		await testPostRequest(
			`/v2/node/Team/${teamCode}?upsert=true`,
			{
				techLeads: [personCode],
				parentGroup: groupCode,
			},
			200,
			sandbox.withCreateMeta({
				code: teamCode,
				techLeads: [personCode],
				parentGroup: groupCode,
			}),
		);

		await testNode(
			'Team',
			teamCode,
			sandbox.withCreateMeta({
				code: teamCode,
			}),
			[
				{
					type: 'HAS_TECH_LEAD',
					direction: 'outgoing',
					props: sandbox.withCreateMeta({}),
				},
				{
					type: 'Person',
					props: sandbox.withCreateMeta({ code: personCode }),
				},
			],
			[
				{
					type: 'HAS_TEAM',
					direction: 'incoming',
					props: sandbox.withCreateMeta({}),
				},
				{
					type: 'Group',
					props: sandbox.withCreateMeta({ code: groupCode }),
				},
			],
		);

		sandbox.expectKinesisEvents(
			[
				'CREATE',
				teamCode,
				'Team',
				['code', 'techLeads', 'parentGroup', 'group'],
			],
			['CREATE', personCode, 'Person', ['code', 'techLeadFor']],
			[
				'CREATE',
				groupCode,
				'Group',
				['code', 'allTeams', 'topLevelTeams'],
			],
		);
	});

	describe('locked Fields', () => {
		it('creates a node with _lockedFields', async () => {
			await testPostRequest(
				`/v2/node/Team/${teamCode}?lockFields=name`,
				{ name: 'name1' },
				200,
				sandbox.withCreateMeta({
					code: 'v2-node-post-team',
					name: 'name1',
					_lockedFields: '{"name":"v2-node-post-client"}',
				}),
			);
		});

		it('creates a node with 4 fields but ONLY locks the name field', async () => {
			await testPostRequest(
				`/v2/node/Team/${teamCode}?lockFields=name`,
				{ name: 'name1', email: 'tech@lt.com', slack: 'slack channel' },
				200,
				sandbox.withCreateMeta({
					code: 'v2-node-post-team',
					name: 'name1',
					email: 'tech@lt.com',
					slack: 'slack channel',
					_lockedFields: '{"name":"v2-node-post-client"}',
				}),
			);
		});

		it('creates a node and locks ALL fields that are written', async () => {
			await testPostRequest(
				`/v2/node/Team/${teamCode}?lockFields=all`,
				{ name: 'name1' },
				200,
				sandbox.withCreateMeta({
					code: 'v2-node-post-team',
					name: 'name1',
					_lockedFields: '{"name":"v2-node-post-client"}',
				}),
			);
		});

		describe('no client-id header', () => {
			setupMocks(sandbox, { namespace }, false);

			it('throws an error when clientId is not set', async () => {
				await testPostRequest(
					`/v2/node/Team/${teamCode}?lockFields=all`,
					{ name: 'name1' },
					400,
					/clientId needs to be set to a valid system code in order to lock fields/,
				);
			});
		});
	});
});

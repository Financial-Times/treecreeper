const app = require('../../server/app.js');
const {
	setupMocks,
	stubDbUnavailable,
	testNode,
	verifyNotExists,
	verifyExists
} = require('./helpers');

const queryBatchingTests = require('./test-bundles/query-batching');

describe('v2 - node POST', () => {
	const sandbox = {};
	const namespace = 'v2-node-post';

	const teamCode = `${namespace}-team`;
	const personCode = `${namespace}-person`;
	const groupCode = `${namespace}-group`;
	const requestId = `${namespace}-request`;
	const clientId = `${namespace}-client`;

	setupMocks(sandbox, { namespace });

	it('responds with 500 if query fails', async () => {
		stubDbUnavailable(sandbox);
		return sandbox
			.request(app)
			.post(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.send({})
			.expect(500);
		expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
		verifyNotExists('Team', teamCode);
	});

	it('create node', async () => {
		await sandbox
			.request(app)
			.post(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.send({ name: 'name1' })
			.expect(
				200,
				sandbox.withCreateMeta({
					code: teamCode,
					name: 'name1'
				})
			);

		await testNode(
			'Team',
			teamCode,
			sandbox.withCreateMeta({
				code: teamCode,
				name: 'name1'
			})
		);
		expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(1);
		expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
			action: 'CREATE',
			code: `${namespace}-team`,
			type: 'Team',
			requestId,
			clientId
		});
	});

	it('error when creating duplicate node', async () => {
		await sandbox.createNode('Team', {
			code: teamCode
		});
		await sandbox
			.request(app)
			.post(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.send({})
			.expect(409, new RegExp(`Team ${teamCode} already exists`));
		expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
	});

	it('error when conflicting code values', async () => {
		await sandbox
			.request(app)
			.post(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.send({ code: 'wrong-code' })
			.expect(
				400,
				new RegExp(
					`Conflicting code attribute \`wrong-code\` for Team ${teamCode}`
				)
			);
		expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
		verifyNotExists('Team', teamCode);
	});

	it('error when unrecognised attribute', async () => {
		await sandbox
			.request(app)
			.post(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.send({ foo: 'unrecognised' })
			.expect(400, /Unexpected attribute `foo` on Team/);
		expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
		verifyNotExists('Team', teamCode);
	});

	it('not error when non-conflicting code values', async () => {
		await sandbox
			.request(app)
			.post(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.send({ code: teamCode })
			.expect(200);
		expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(1);
		verifyExists('Team', teamCode);
	});

	it('create node related to existing nodes', async () => {
		await sandbox.createNodes(['Person', personCode], ['Group', groupCode]);
		await sandbox
			.request(app)
			.post(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.send({
				techLeads: [personCode],
				parentGroup: groupCode
			})
			.expect(
				200,
				sandbox.withCreateMeta({
					code: teamCode,
					techLeads: [personCode],
					parentGroup: groupCode
				})
			);

		await testNode(
			'Team',
			teamCode,
			sandbox.withCreateMeta({
				code: teamCode
			}),
			[
				{
					type: 'HAS_TECH_LEAD',
					direction: 'outgoing',
					props: sandbox.withCreateMeta({})
				},
				{
					type: 'Person',
					props: sandbox.withMeta({ code: personCode })
				}
			],
			[
				{
					type: 'HAS_TEAM',
					direction: 'incoming',
					props: sandbox.withCreateMeta({})
				},
				{
					type: 'Group',
					props: sandbox.withMeta({ code: groupCode })
				}
			]
		);

		expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(3);
		expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
			action: 'CREATE',
			code: teamCode,
			type: 'Team',
			requestId,
			clientId
		});
		expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
			action: 'UPDATE',
			code: personCode,
			type: 'Person',
			requestId,
			clientId
		});
		expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
			action: 'UPDATE',
			code: groupCode,
			type: 'Group',
			requestId,
			clientId
		});
	});

	it('error when creating node related to non-existent nodes', async () => {
		await sandbox
			.request(app)
			.post(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.send({
				techLeads: [personCode],
				parentGroup: groupCode
			})
			.expect(400, /Missing related node/);
		expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
		verifyNotExists('Team', teamCode);
	});

	it('create node related to non-existent nodes when using upsert=true', async () => {
		await sandbox
			.request(app)
			.post(`/v2/node/Team/${teamCode}?upsert=true`)
			.namespacedAuth()
			.send({
				techLeads: [personCode],
				parentGroup: groupCode
			})
			.expect(
				200,
				sandbox.withCreateMeta({
					code: teamCode,
					techLeads: [personCode],
					parentGroup: groupCode
				})
			);

		await testNode(
			'Team',
			teamCode,
			sandbox.withCreateMeta({
				code: teamCode
			}),
			[
				{
					type: 'HAS_TECH_LEAD',
					direction: 'outgoing',
					props: sandbox.withCreateMeta({})
				},
				{
					type: 'Person',
					props: sandbox.withCreateMeta({ code: personCode })
				}
			],
			[
				{
					type: 'HAS_TEAM',
					direction: 'incoming',
					props: sandbox.withCreateMeta({})
				},
				{
					type: 'Group',
					props: sandbox.withCreateMeta({ code: groupCode })
				}
			]
		);

		expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(3);
		expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
			action: 'CREATE',
			code: teamCode,
			type: 'Team',
			requestId,
			clientId
		});
		expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
			action: 'CREATE',
			code: personCode,
			type: 'Person',
			requestId,
			clientId
		});
		expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
			action: 'CREATE',
			code: groupCode,
			type: 'Group',
			requestId,
			clientId
		});
	});

	queryBatchingTests({
		method: 'post',
		url: `/v2/node/System/${namespace}-system?upsert=true`,
		namespace,
		sandbox,
		app
	});
});

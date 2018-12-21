const app = require('../../server/app.js');
const {
	setupMocks,
	stubDbUnavailable,
	testNode,
	verifyNotExists,
	verifyExists
} = require('../helpers');

describe('v2 - node POST', () => {
	const sandbox = {};
	const namespace = 'v2-node-post';

	const teamCode = `${namespace}-team`;
	const personCode = `${namespace}-person`;
	const groupCode = `${namespace}-group`;

	setupMocks(sandbox, { namespace });

	it('responds with 500 if query fails', async () => {
		stubDbUnavailable(sandbox);
		await sandbox
			.request(app)
			.post(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.send({})
			.expect(500);
		sandbox.expectNoEvents();
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
		sandbox.expectEvents(['CREATE', `${namespace}-team`, 'Team']);
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
		sandbox.expectNoEvents();
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
					`Conflicting code property \`wrong-code\` in payload for Team ${teamCode}`
				)
			);
		sandbox.expectNoEvents();
		await verifyNotExists('Team', teamCode);
	});

	it('error when unrecognised property', async () => {
		await sandbox
			.request(app)
			.post(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.send({ foo: 'unrecognised' })
			.expect(400, /Invalid property `foo` on type `Team`/);
		expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
		await verifyNotExists('Team', teamCode);
	});

	it('not error when non-conflicting code values', async () => {
		await sandbox
			.request(app)
			.post(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.send({ code: teamCode })
			.expect(200);
		sandbox.expectEvents(['CREATE', teamCode, 'Team']);
		await verifyExists('Team', teamCode);
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

		sandbox.expectEvents(
			['CREATE', teamCode, 'Team'],
			['UPDATE', personCode, 'Person'],
			['UPDATE', groupCode, 'Group']
		);
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
		sandbox.expectNoEvents();
		await verifyNotExists('Team', teamCode);
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

		sandbox.expectEvents(
			['CREATE', teamCode, 'Team'],
			['CREATE', personCode, 'Person'],
			['CREATE', groupCode, 'Group']
		);
	});
});

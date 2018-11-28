const app = require('../../server/app.js');
const {
	setupMocks,
	verifyExists,
	verifyNotExists,
	testNode
} = require('./helpers');

describe('merge', () => {
	const sandbox = {};
	const namespace = 'v2-merge';

	const teamCode1 = `${namespace}-team-1`;
	const teamCode2 = `${namespace}-team-2`;
	const personCode = `${namespace}-person`;
	const groupCode = `${namespace}-group`;

	const requestId = `${namespace}-request`;
	const clientId = `${namespace}-client`;

	setupMocks(sandbox, { namespace });

	describe('error handling', () => {
		beforeEach(() =>
			sandbox.createNodes(['Team', teamCode1], ['Team', teamCode2]));

		it('errors if no type supplied', async () => {
			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					sourceCode: teamCode1,
					destinationCode: teamCode2
				})
				.expect(400, /No type/);
			await Promise.all([
				verifyExists('Team', teamCode1),
				verifyExists('Team', teamCode2)
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
		});

		it('errors if no source code supplied', async () => {
			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'Team',
					destinationCode: teamCode2
				})
				.expect(400, /No sourceCode/);
			await Promise.all([
				verifyExists('Team', teamCode1),
				verifyExists('Team', teamCode2)
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
		});
		it('errors if no destination code supplied', async () => {
			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'Team',
					sourceCode: teamCode1
				})
				.expect(400, /No destinationCode/);
			await Promise.all([
				verifyExists('Team', teamCode1),
				verifyExists('Team', teamCode2)
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
		});
		it('errors if type invalid', async () => {
			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'NotTeam',
					sourceCode: teamCode1,
					destinationCode: teamCode2
				})
				.expect(400, /Invalid node type/);
			await Promise.all([
				verifyExists('Team', teamCode1),
				verifyExists('Team', teamCode2)
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
		});

		it('errors if source code does not exist', async () => {
			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'Team',
					sourceCode: 'not-team1',
					destinationCode: teamCode2
				})
				.expect(404, /record missing/);
			await Promise.all([
				verifyExists('Team', teamCode1),
				verifyExists('Team', teamCode2)
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
		});
		it('errors if destination code does not exist', async () => {
			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'Team',
					sourceCode: teamCode1,
					destinationCode: 'not-team2'
				})
				.expect(404, /record missing/);
			await Promise.all([
				verifyExists('Team', teamCode1),
				verifyExists('Team', teamCode2)
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
		});
	});
	describe('successful application', () => {
		it('merge unconnected nodes', async () => {
			await sandbox.createNodes(['Team', teamCode1], ['Team', teamCode2]);

			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'Team',
					sourceCode: teamCode1,
					destinationCode: teamCode2
				})
				.expect(200);
			await Promise.all([
				verifyNotExists('Team', teamCode1),
				verifyExists('Team', teamCode2)
			]);

			expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(2);
			expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
				action: 'DELETE',
				code: teamCode1,
				type: 'Team',
				requestId,
				clientId
			});
			// TODO try to avoid this event when no properties or relationships have actually changed
			expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
				action: 'UPDATE',
				code: teamCode2,
				type: 'Team',
				requestId,
				clientId
			});
		});

		it('move outgoing relationships', async () => {
			const [team1, , person] = await sandbox.createNodes(
				['Team', teamCode1],
				['Team', teamCode2],
				['Person', personCode]
			);

			await sandbox.connectNodes(team1, 'HAS_TECH_LEAD', person);

			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'Team',
					sourceCode: teamCode1,
					destinationCode: teamCode2
				})
				.expect(200);
			await verifyNotExists('Team', teamCode1);

			await testNode(
				'Team',
				teamCode2,
				sandbox.withMeta({
					code: teamCode2
				}),
				[
					{
						type: 'HAS_TECH_LEAD',
						direction: 'outgoing',
						props: sandbox.withMeta({})
					},
					{
						type: 'Person',
						props: sandbox.withMeta({ code: personCode })
					}
				]
			);
			expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(3);
			expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
				action: 'DELETE',
				code: teamCode1,
				type: 'Team',
				requestId,
				clientId
			});
			expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
				action: 'UPDATE',
				code: teamCode2,
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
		});

		it('move incoming relationships', async () => {
			const [team1, , group] = await sandbox.createNodes(
				['Team', teamCode1],
				['Team', teamCode2],
				['Group', groupCode]
			);

			await sandbox.connectNodes(group, 'HAS_TEAM', team1);

			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'Team',
					sourceCode: teamCode1,
					destinationCode: teamCode2
				})
				.expect(200);
			await verifyNotExists('Team', teamCode1);

			await testNode(
				'Team',
				teamCode2,
				sandbox.withMeta({
					code: teamCode2
				}),
				[
					{
						type: 'HAS_TEAM',
						direction: 'incoming',
						props: sandbox.withMeta({})
					},
					{
						type: 'Group',
						props: sandbox.withMeta({ code: groupCode })
					}
				]
			);

			expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(3);
			expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
				action: 'DELETE',
				code: teamCode1,
				type: 'Team',
				requestId,
				clientId
			});
			expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
				action: 'UPDATE',
				code: teamCode2,
				type: 'Team',
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

		it('merges identical relationships', async () => {
			const [team1, team2, person] = await sandbox.createNodes(
				['Team', teamCode1],
				['Team', teamCode2],
				['Person', personCode]
			);

			await sandbox.connectNodes(
				[team1, 'HAS_TECH_LEAD', person],
				[team2, 'HAS_TECH_LEAD', person]
			);

			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'Team',
					sourceCode: teamCode1,
					destinationCode: teamCode2
				})
				.expect(200);
			await verifyNotExists('Team', teamCode1);

			await testNode(
				'Team',
				teamCode2,
				sandbox.withMeta({
					code: teamCode2
				}),
				[
					{
						type: 'HAS_TECH_LEAD',
						direction: 'outgoing',
						props: sandbox.withMeta({})
					},
					{
						type: 'Person',
						props: sandbox.withMeta({ code: personCode })
					}
				]
			);
			expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(2);
			expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
				action: 'DELETE',
				code: teamCode1,
				type: 'Team',
				requestId,
				clientId
			});
			expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
				action: 'UPDATE',
				code: teamCode2,
				type: 'Team',
				requestId,
				clientId
			});
		});

		it('discard any newly reflexive relationships', async () => {
			const [team1, team2] = await sandbox.createNodes(
				['Team', teamCode1],
				['Team', teamCode2]
			);

			await sandbox.connectNodes(team1, 'HAS_TEAM', team2);

			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'Team',
					sourceCode: teamCode1,
					destinationCode: teamCode2
				})
				.expect(200);
			await verifyNotExists('Team', teamCode1);

			await testNode(
				'Team',
				teamCode2,
				sandbox.withMeta({
					code: teamCode2
				})
			);
			expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(2);
			expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
				action: 'DELETE',
				code: teamCode1,
				type: 'Team',
				requestId,
				clientId
			});
			expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
				action: 'UPDATE',
				code: teamCode2,
				type: 'Team',
				requestId,
				clientId
			});
		});

		it('not modify existing properties of destination node', async () => {
			await sandbox.createNodes(
				['Team', { code: teamCode1, name: 'potato' }],
				['Team', { code: teamCode2, name: 'tomato' }]
			);
			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'Team',
					sourceCode: teamCode1,
					destinationCode: teamCode2
				})
				.expect(200);
			await testNode(
				'Team',
				teamCode2,
				sandbox.withMeta({
					code: teamCode2,
					name: 'tomato'
				})
			);

			expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(2);
			expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
				action: 'DELETE',
				code: teamCode1,
				type: 'Team',
				requestId,
				clientId
			});
			expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
				action: 'UPDATE',
				code: teamCode2,
				type: 'Team',
				requestId,
				clientId
			});
		});

		it('add new properties to destination node', async () => {
			await sandbox.createNodes(
				['Team', { code: teamCode1, name: 'potato' }],
				['Team', { code: teamCode2 }]
			);
			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'Team',
					sourceCode: teamCode1,
					destinationCode: teamCode2
				})
				.expect(200);
			await testNode(
				'Team',
				teamCode2,
				sandbox.withMeta({
					code: teamCode2,
					name: 'potato'
				})
			);

			expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(2);
			expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
				action: 'DELETE',
				code: teamCode1,
				type: 'Team',
				requestId,
				clientId
			});
			expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
				action: 'UPDATE',
				code: teamCode2,
				type: 'Team',
				requestId,
				clientId
			});
		});
	});
});

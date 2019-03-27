const app = require('../../server/app.js');
const {
	setupMocks,
	verifyExists,
	verifyNotExists,
	testNode,
} = require('../helpers');

describe('merge', () => {
	const sandbox = {};
	const namespace = 'v2-merge';

	const teamCode1 = `${namespace}-team-1`;
	const teamCode2 = `${namespace}-team-2`;
	const personCode = `${namespace}-person`;
	const groupCode = `${namespace}-group`;

	setupMocks(sandbox, { namespace });

	describe('error handling', () => {
		beforeEach(() =>
			sandbox.createNodes(['Team', teamCode1], ['Team', teamCode2]),
		);

		it('errors if no type supplied', async () => {
			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					sourceCode: teamCode1,
					destinationCode: teamCode2,
				})
				.expect(400, /No type/);

			await Promise.all([
				verifyExists('Team', teamCode1),
				verifyExists('Team', teamCode2),
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
					destinationCode: teamCode2,
				})
				.expect(400, /No sourceCode/);
			await Promise.all([
				verifyExists('Team', teamCode1),
				verifyExists('Team', teamCode2),
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
					sourceCode: teamCode1,
				})
				.expect(400, /No destinationCode/);
			await Promise.all([
				verifyExists('Team', teamCode1),
				verifyExists('Team', teamCode2),
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
					destinationCode: teamCode2,
				})
				.expect(400, /Invalid node type/);
			await Promise.all([
				verifyExists('Team', teamCode1),
				verifyExists('Team', teamCode2),
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
					destinationCode: teamCode2,
				})
				.expect(404, /record missing/);
			await Promise.all([
				verifyExists('Team', teamCode1),
				verifyExists('Team', teamCode2),
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
					destinationCode: 'not-team2',
				})
				.expect(404, /record missing/);
			await Promise.all([
				verifyExists('Team', teamCode1),
				verifyExists('Team', teamCode2),
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
					destinationCode: teamCode2,
				})
				.expect(200);
			await Promise.all([
				verifyNotExists('Team', teamCode1),
				verifyExists('Team', teamCode2),
			]);
			sandbox.expectEvents(['DELETE', teamCode1, 'Team']);
		});

		it('move outgoing relationships', async () => {
			const [team1, , person] = await sandbox.createNodes(
				['Team', teamCode1],
				['Team', teamCode2],
				['Person', personCode],
			);

			await sandbox.connectNodes(team1, 'HAS_TECH_LEAD', person);

			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'Team',
					sourceCode: teamCode1,
					destinationCode: teamCode2,
				})
				.expect(200);
			await verifyNotExists('Team', teamCode1);

			await testNode(
				'Team',
				teamCode2,
				sandbox.withMeta({
					code: teamCode2,
				}),
				[
					{
						type: 'HAS_TECH_LEAD',
						direction: 'outgoing',
						props: sandbox.withMeta({}),
					},
					{
						type: 'Person',
						props: sandbox.withMeta({ code: personCode }),
					},
				],
			);

			sandbox.expectEvents(
				['DELETE', teamCode1, 'Team'],
				['UPDATE', teamCode2, 'Team', ['techLeads']],
				['UPDATE', personCode, 'Person', ['techLeadFor']],
			);
		});

		it('move incoming relationships', async () => {
			const [team1, , group] = await sandbox.createNodes(
				['Team', teamCode1],
				['Team', teamCode2],
				['Group', groupCode],
			);

			await sandbox.connectNodes(group, 'HAS_TEAM', team1);

			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'Team',
					sourceCode: teamCode1,
					destinationCode: teamCode2,
				})
				.expect(200);
			await verifyNotExists('Team', teamCode1);

			await testNode(
				'Team',
				teamCode2,
				sandbox.withMeta({
					code: teamCode2,
				}),
				[
					{
						type: 'HAS_TEAM',
						direction: 'incoming',
						props: sandbox.withMeta({}),
					},
					{
						type: 'Group',
						props: sandbox.withMeta({ code: groupCode }),
					},
				],
			);

			sandbox.expectEvents(
				['DELETE', teamCode1, 'Team'],
				['UPDATE', teamCode2, 'Team', ['group', 'parentGroup']],
				['UPDATE', groupCode, 'Group', ['topLevelTeams', 'allTeams']],
			);
		});

		it('merges identical relationships', async () => {
			const [team1, team2, person] = await sandbox.createNodes(
				['Team', teamCode1],
				['Team', teamCode2],
				['Person', personCode],
			);

			await sandbox.connectNodes(
				[team1, 'HAS_TECH_LEAD', person],
				[team2, 'HAS_TECH_LEAD', person],
			);

			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'Team',
					sourceCode: teamCode1,
					destinationCode: teamCode2,
				})
				.expect(200);
			await verifyNotExists('Team', teamCode1);

			await testNode(
				'Team',
				teamCode2,
				sandbox.withMeta({
					code: teamCode2,
				}),
				[
					{
						type: 'HAS_TECH_LEAD',
						direction: 'outgoing',
						props: sandbox.withMeta({}),
					},
					{
						type: 'Person',
						props: sandbox.withMeta({ code: personCode }),
					},
				],
			);
			sandbox.expectEvents(['DELETE', teamCode1, 'Team']);
		});

		it('discard any newly reflexive relationships', async () => {
			const [team1, team2] = await sandbox.createNodes(
				['Team', teamCode1],
				['Team', teamCode2],
			);

			await sandbox.connectNodes(team1, 'HAS_TEAM', team2);
			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'Team',
					sourceCode: teamCode1,
					destinationCode: teamCode2,
				})
				.expect(200);
			await verifyNotExists('Team', teamCode1);

			await testNode(
				'Team',
				teamCode2,
				sandbox.withMeta({
					code: teamCode2,
				}),
			);
			sandbox.expectEvents(
				['DELETE', teamCode1, 'Team'],
				['UPDATE', teamCode2, 'Team', ['parentTeam']],
			);
		});

		it('not modify existing properties of destination node', async () => {
			await sandbox.createNodes(
				['Team', { code: teamCode1, name: 'potato' }],
				['Team', { code: teamCode2, name: 'tomato' }],
			);
			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'Team',
					sourceCode: teamCode1,
					destinationCode: teamCode2,
				})
				.expect(200);
			await testNode(
				'Team',
				teamCode2,
				sandbox.withMeta({
					code: teamCode2,
					name: 'tomato',
				}),
			);

			sandbox.expectEvents(['DELETE', teamCode1, 'Team']);
		});

		it('add new properties to destination node', async () => {
			await sandbox.createNodes(
				['Team', { code: teamCode1, name: 'potato' }],
				['Team', { code: teamCode2 }],
			);
			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'Team',
					sourceCode: teamCode1,
					destinationCode: teamCode2,
				})
				.expect(200);
			await testNode(
				'Team',
				teamCode2,
				sandbox.withMeta({
					code: teamCode2,
					name: 'potato',
				}),
			);

			sandbox.expectEvents(
				['DELETE', teamCode1, 'Team'],
				['UPDATE', teamCode2, 'Team', ['name']],
			);
		});

		it('does not overwrite __-to-one relationships', async () => {
			const [
				system1,
				system2,
				person1,
				person2,
			] = await sandbox.createNodes(
				['System', `${namespace}-system-1`],
				['System', `${namespace}-system-2`],
				['Person', `${namespace}-person-1`],
				['Person', `${namespace}-person-2`],
			);

			await sandbox.connectNodes(
				[system1, 'HAS_TECHNICAL_OWNER', person1],
				[system2, 'HAS_TECHNICAL_OWNER', person2],
			);

			await sandbox
				.request(app)
				.post('/v2/merge')
				.namespacedAuth()
				.send({
					type: 'System',
					sourceCode: `${namespace}-system-1`,
					destinationCode: `${namespace}-system-2`,
				})
				.expect(200);
			await verifyNotExists('Team', teamCode1);

			await testNode(
				'System',
				`${namespace}-system-2`,
				sandbox.withMeta({
					code: `${namespace}-system-2`,
				}),
				[
					{
						type: 'HAS_TECHNICAL_OWNER',
						direction: 'outgoing',
						props: sandbox.withMeta({}),
					},
					{
						type: 'Person',
						props: sandbox.withMeta({
							code: `${namespace}-person-2`,
						}),
					},
				],
			);
			sandbox.expectEvents(
				['DELETE', `${namespace}-system-1`, 'System'],
				[
					'UPDATE',
					`${namespace}-person-1`,
					'Person',
					['technicalOwnerFor'],
				],
			);
		});
	});
});

const app = require('../../server/app.js');
const {
	setupMocks,
	verifyExists,
	verifyNotExists,
	testNode,
	stubDbUnavailable,
	stubS3Unavailable,
} = require('../helpers');

describe('merge', () => {
	const sandbox = {};
	const namespace = 'v2-merge';

	const teamCode1 = `${namespace}-team-1`;
	const teamCode2 = `${namespace}-team-2`;
	const personCode = `${namespace}-person`;
	const groupCode = `${namespace}-group`;
	const systemCode1 = `${namespace}-system-1`;
	const systemCode2 = `${namespace}-system-2`;

	setupMocks(sandbox, { namespace });

	const testMergeRequest = (payload, ...expectations) => {
		expectations[0] = expectations[0] || 200;
		return sandbox
			.request(app)
			.post('/v2/merge')
			.namespacedAuth()
			.send(payload)
			.expect(...expectations);
	};

	describe('error handling', () => {
		beforeEach(() =>
			sandbox.createNodes(['Team', teamCode1], ['Team', teamCode2]),
		);

		it('responds with 500 if neo4j query fails', async () => {
			await sandbox.createNodes(
				['System', systemCode1, { troubleshooting: 'Fake Document' }],
				[
					'System',
					systemCode2,
					{ architectureDiagram: 'Another Fake Document' },
				],
			);
			stubDbUnavailable(sandbox);
			await testMergeRequest(
				{
					type: 'System',
					sourceCode: systemCode1,
					destinationCode: systemCode2,
				},
				500,
			);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});

		it('responds with 500 if s3 query fails', async () => {
			stubS3Unavailable(sandbox);
			await sandbox.createNodes(
				['System', systemCode1, { troubleshooting: 'Fake Document' }],
				[
					'System',
					systemCode2,
					{ architectureDiagram: 'Another Fake Document' },
				],
			);
			await testMergeRequest(
				{
					type: 'System',
					sourceCode: systemCode1,
					destinationCode: systemCode2,
				},
				500,
			);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});

		it('errors if no type supplied', async () => {
			await testMergeRequest(
				{
					sourceCode: teamCode1,
					destinationCode: teamCode2,
				},
				400,
				/No type/,
			);

			await Promise.all([
				verifyExists('Team', teamCode1),
				verifyExists('Team', teamCode2),
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});

		it('errors if no source code supplied', async () => {
			await testMergeRequest(
				{
					type: 'Team',
					destinationCode: teamCode2,
				},
				400,
				/No sourceCode/,
			);
			await Promise.all([
				verifyExists('Team', teamCode1),
				verifyExists('Team', teamCode2),
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});
		it('errors if no destination code supplied', async () => {
			await testMergeRequest(
				{
					type: 'Team',
					sourceCode: teamCode1,
				},
				400,
				/No destinationCode/,
			);
			await Promise.all([
				verifyExists('Team', teamCode1),
				verifyExists('Team', teamCode2),
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});
		it('errors if type invalid', async () => {
			await testMergeRequest(
				{
					type: 'NotTeam',
					sourceCode: teamCode1,
					destinationCode: teamCode2,
				},
				400,
				/Invalid type/,
			);
			await Promise.all([
				verifyExists('Team', teamCode1),
				verifyExists('Team', teamCode2),
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});

		it('errors if source code does not exist', async () => {
			await testMergeRequest(
				{
					type: 'Team',
					sourceCode: 'not-team1',
					destinationCode: teamCode2,
				},
				404,
				/record missing/,
			);
			await Promise.all([
				verifyExists('Team', teamCode1),
				verifyExists('Team', teamCode2),
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});
		it('errors if destination code does not exist', async () => {
			await testMergeRequest(
				{
					type: 'Team',
					sourceCode: teamCode1,
					destinationCode: 'not-team2',
				},
				404,
				/record missing/,
			);
			await Promise.all([
				verifyExists('Team', teamCode1),
				verifyExists('Team', teamCode2),
			]);
			expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
			sandbox.expectNoS3Actions('upload', 'patch', 'delete', 'merge');
		});
	});
	describe('successful application', () => {
		it('merges unconnected nodes', async () => {
			await sandbox.createNodes(['Team', teamCode1], ['Team', teamCode2]);

			await testMergeRequest({
				type: 'Team',
				sourceCode: teamCode1,
				destinationCode: teamCode2,
			});
			await Promise.all([
				verifyNotExists('Team', teamCode1),
				verifyExists('Team', teamCode2),
			]);
			sandbox.expectKinesisEvents(['DELETE', teamCode1, 'Team']);
		});

		it('merges unconnected nodes with document properties in s3', async () => {
			await sandbox.createNodes(
				['System', systemCode1, { troubleshooting: 'Fake Document' }],
				[
					'System',
					systemCode2,
					{ architectureDiagram: 'Another Fake Document' },
				],
			);
			await testMergeRequest({
				type: 'System',
				sourceCode: systemCode1,
				destinationCode: systemCode2,
			});
			sandbox.expectS3Actions({
				action: 'merge',
				nodeType: 'System',
				sourceCode: systemCode1,
				destinationCode: systemCode2,
			});
		});

		it("doesn't error when unrecognised properties exist", async () => {
			await sandbox.createNodes(
				['Team', teamCode1, { someProp: 'someVal' }],
				['Team', teamCode2],
			);

			await testMergeRequest({
				type: 'Team',
				sourceCode: teamCode1,
				destinationCode: teamCode2,
			});
			await Promise.all([
				verifyNotExists('Team', teamCode1),
				verifyExists('Team', teamCode2),
			]);

			await testNode(
				'Team',
				teamCode2,
				sandbox.withUpdateMeta({
					code: teamCode2,
				}),
			);
			sandbox.expectKinesisEvents(['DELETE', teamCode1, 'Team']);
		});

		it('move outgoing relationships', async () => {
			const [team1, , person] = await sandbox.createNodes(
				['Team', teamCode1],
				['Team', teamCode2],
				['Person', personCode],
			);

			await sandbox.connectNodes(team1, 'HAS_TECH_LEAD', person);

			await testMergeRequest({
				type: 'Team',
				sourceCode: teamCode1,
				destinationCode: teamCode2,
			});
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

			sandbox.expectKinesisEvents(
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

			await testMergeRequest({
				type: 'Team',
				sourceCode: teamCode1,
				destinationCode: teamCode2,
			});
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

			sandbox.expectKinesisEvents(
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

			await testMergeRequest({
				type: 'Team',
				sourceCode: teamCode1,
				destinationCode: teamCode2,
			});
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
			sandbox.expectKinesisEvents(['DELETE', teamCode1, 'Team']);
		});

		it('discard any newly reflexive relationships', async () => {
			const [team1, team2] = await sandbox.createNodes(
				['Team', teamCode1],
				['Team', teamCode2],
			);

			await sandbox.connectNodes(team1, 'HAS_TEAM', team2);
			await testMergeRequest({
				type: 'Team',
				sourceCode: teamCode1,
				destinationCode: teamCode2,
			});
			await verifyNotExists('Team', teamCode1);

			await testNode(
				'Team',
				teamCode2,
				sandbox.withMeta({
					code: teamCode2,
				}),
			);
			sandbox.expectKinesisEvents(
				['DELETE', teamCode1, 'Team'],
				['UPDATE', teamCode2, 'Team', ['parentTeam']],
			);
		});

		it('not modify existing properties of destination node', async () => {
			await sandbox.createNodes(
				['Team', { code: teamCode1, name: 'potato' }],
				['Team', { code: teamCode2, name: 'tomato' }],
			);
			await testMergeRequest({
				type: 'Team',
				sourceCode: teamCode1,
				destinationCode: teamCode2,
			});
			await testNode(
				'Team',
				teamCode2,
				sandbox.withMeta({
					code: teamCode2,
					name: 'tomato',
				}),
			);

			sandbox.expectKinesisEvents(['DELETE', teamCode1, 'Team']);
		});

		it('add new properties to destination node', async () => {
			await sandbox.createNodes(
				['Team', { code: teamCode1, name: 'potato' }],
				['Team', { code: teamCode2 }],
			);
			await testMergeRequest({
				type: 'Team',
				sourceCode: teamCode1,
				destinationCode: teamCode2,
			});
			await testNode(
				'Team',
				teamCode2,
				sandbox.withMeta({
					code: teamCode2,
					name: 'potato',
				}),
			);

			sandbox.expectKinesisEvents(
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

			await testMergeRequest({
				type: 'System',
				sourceCode: `${namespace}-system-1`,
				destinationCode: `${namespace}-system-2`,
			});
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
			sandbox.expectKinesisEvents(
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

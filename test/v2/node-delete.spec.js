const app = require('../../server/app.js');
const {
	setupMocks,
	stubDbUnavailable,
	verifyNotExists,
	verifyExists,
} = require('../helpers');

describe('v2 - node DELETE', () => {
	const sandbox = {};
	const namespace = 'v2-node-delete';
	const teamCode = `${namespace}-team`;

	setupMocks(sandbox, { namespace });

	const testDeleteRequest = (...expectations) =>
		sandbox
			.request(app)
			.delete(`/v2/node/Team/${teamCode}`)
			.namespacedAuth()
			.expect(...expectations);

	it('deletes a detached node', async () => {
		await sandbox.createNode('Team', {
			code: teamCode,
			name: 'name1',
		});
		await testDeleteRequest(204);

		await verifyNotExists('Team', teamCode);
		sandbox.expectKinesisEvents(['DELETE', teamCode, 'Team']);
	});

	it('404 when deleting non-existent node', async () => {
		await testDeleteRequest(404);
		sandbox.expectNoKinesisEvents();
	});

	it('error informatively when attempting to delete connected node', async () => {
		const [team, person] = await sandbox.createNodes(
			['Team', `${teamCode}`],
			['Person', `${namespace}-person`],
		);
		await sandbox.connectNodes([team, 'HAS_TECH_LEAD', person]);

		await testDeleteRequest(
			409,
			new RegExp(
				`Cannot delete - Team ${teamCode} has relationships. Remove all techLeads relationships before attempting to delete this record.`,
			),
		);

		await verifyExists('Team', teamCode);
		sandbox.expectNoKinesisEvents();
	});

	it('responds with 500 if query fails', async () => {
		stubDbUnavailable(sandbox);
		await testDeleteRequest(500);
		sandbox.expectNoKinesisEvents();
		sandbox.expectS3Actions([
			{
				action: 'delete',
				nodeType: 'Team',
				code: teamCode,
			},
			{
				action: 'restore',
				nodeType: 'Team',
				code: teamCode,
			},
		]);
	});
});

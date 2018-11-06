const app = require('../../server/app.js');
const {
	setupMocks,
	stubDbUnavailable,
	verifyNotExists,
	verifyExists
} = require('./helpers');

describe('v2 - node DELETE', () => {
	const sandbox = {};
	const namespace = 'v2-node-delete';

	setupMocks(sandbox, { namespace });

	it('deletes a detached node', async () => {
		await sandbox.createNode('Team', {
			code: `${namespace}-team`,
			name: 'name1'
		});
		await sandbox
			.request(app)
			.delete(`/v2/node/Team/${namespace}-team`)
			.namespacedAuth()
			.expect(204);

		await verifyNotExists('Team', `${namespace}-team`);
		expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(1);
		expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
			action: 'DELETE',
			code: `${namespace}-team`,
			type: 'Team',
			requestId: `${namespace}-request`,
			clientId: `${namespace}-client`
		});
	});

	it('404 when deleting non-existent node', async () => {
		await sandbox
			.request(app)
			.delete(`/v2/node/Team/${namespace}-team`)
			.namespacedAuth()
			.expect(404);
		expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
	});

	it('error informatively when attempting to delete connected node', async () => {
		const [team, person] = await sandbox.createNodes(
			['Team', `${namespace}-team`],
			['Person', `${namespace}-person`]
		);
		await sandbox.connectNodes([team, 'HAS_TECH_LEAD', person]);

		await sandbox
			.request(app)
			.delete(`/v2/node/Team/${namespace}-team`)
			.namespacedAuth()
			.expect(
				409,
				new RegExp(`Cannot delete - Team ${namespace}-team has relationships`)
			);

		await verifyExists('Team', `${namespace}-team`);
		expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
	});

	it('responds with 500 if query fails', async () => {
		stubDbUnavailable(sandbox);
		return sandbox
			.request(app)
			.delete(`/v2/node/Team/${namespace}-team`)
			.auth()
			.expect(500);
		expect(sandbox.stubSendEvent).not.toHaveBeenCalled();
	});
});

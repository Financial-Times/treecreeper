const createApp = require('../../server/create-app.js');

let app;
const {
	setupMocks,
	stubDbUnavailable,
	verifyNotExists,
	verifyExists,
} = require('../helpers');

describe('v2 - node DELETE', () => {
	const sandbox = {};
	const namespace = 'v2-node-delete';
	const mainCode = `${namespace}-main`;

	setupMocks(sandbox, { namespace });

	const testDeleteRequest = (...expectations) =>
		sandbox
			.request(app)
			.delete(`/v2/node/MainType/${mainCode}`)
			.namespacedAuth()
			.expect(...expectations);

	beforeAll(async () => {
		app = await createApp();
	});

	it('deletes a detached node and deletes from s3', async () => {
		await sandbox.createNode('MainType', mainCode);
		await testDeleteRequest(204);

		await verifyNotExists('MainType', mainCode);
	});

	it('404 when deleting non-existent node', async () => {
		await testDeleteRequest(404);

		// bailOnMissingNode throws error before s3 delete
	});

	it('error informatively when attempting to delete connected node', async () => {
		const [main, child] = await sandbox.createNodes(
			['MainType', `${mainCode}`],
			['ChildType', `${namespace}-child`],
		);
		await sandbox.connectNodes([main, 'HAS_CHILD', child]);

		await testDeleteRequest(
			409,
			new RegExp(
				`Cannot delete - MainType ${mainCode} has relationships`,
			),
		);

		await verifyExists('MainType', mainCode);
	});

	it('responds with 500 if neo4j query fails', async () => {
		stubDbUnavailable(sandbox);
		await testDeleteRequest(500);
	});
});

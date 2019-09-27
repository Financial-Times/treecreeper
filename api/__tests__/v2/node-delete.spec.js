const app = require('../../server/app.js');
const {
	setupMocks,
	stubDbUnavailable,
	stubS3Unavailable,
	verifyNotExists,
	verifyExists,
} = require('../helpers');

describe('v2 - node DELETE', () => {
	const sandbox = {};
	const namespace = 'v2-node-delete';
	const rootCode = `${namespace}-root`;

	setupMocks(sandbox, { namespace });

	const testDeleteRequest = (...expectations) =>
		sandbox
			.request(app)
			.delete(`/v2/node/RootType/${rootCode}`)
			.namespacedAuth()
			.expect(...expectations);

	it('deletes a detached node and deletes from s3', async () => {
		await sandbox.createNode('RootType', rootCode);
		await testDeleteRequest(204);

		await verifyNotExists('RootType', rootCode);
		sandbox.expectKinesisEvents(['DELETE', rootCode, 'RootType']);
		sandbox.expectS3Actions({
			action: 'delete',
			nodeType: 'RootType',
			code: rootCode,
		});
		sandbox.expectNoS3Actions('upload', 'patch');
	});

	it('404 when deleting non-existent node', async () => {
		await testDeleteRequest(404);
		sandbox.expectNoKinesisEvents();
		// bailOnMissingNode throws error before s3 delete
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it('error informatively when attempting to delete connected node', async () => {
		const [rootType, childType] = await sandbox.createNodes(
			['RootType', `${rootCode}`],
			['ChildType', `${namespace}-child`],
		);
		await sandbox.connectNodes([rootType, 'HAS_CHILD', childType]);

		await testDeleteRequest(
			409,
			new RegExp(
				`Cannot delete - RootType ${rootCode} has relationships. Remove all children relationships before attempting to delete this record.`,
			),
		);

		await verifyExists('RootType', rootCode);
		sandbox.expectNoKinesisEvents();
		// bailOnAttachedNode throws error before s3 delete
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it('responds with 500 if neo4j query fails', async () => {
		stubDbUnavailable(sandbox);
		await testDeleteRequest(500);
		sandbox.expectNoKinesisEvents();
		// getNodeWithRelationships throws error before s3 delete
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it('responds with 500 if s3 query fails', async () => {
		stubS3Unavailable(sandbox);
		await sandbox.createNode('RootType', rootCode);
		await testDeleteRequest(500);
		sandbox.expectNoKinesisEvents();
		// S3DocumentsHelper throws on instantiation
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});
});

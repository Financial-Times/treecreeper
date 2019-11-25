const createApp = require('../../server/create-app.js');

let app;

const { setupMocks, stubDbUnavailable } = require('../helpers');

describe('v2 - node HEAD', () => {
	const sandbox = {};

	const namespace = 'v2-node-head';
	const mainCode = `${namespace}-main`;
	setupMocks(sandbox, { namespace });

	const testHeadRequest = (url, ...expectations) =>
		sandbox
			.request(app)
			.head(url)
			.namespacedAuth()
			.expect(...expectations);

	beforeAll(async () => {
		app = await createApp();
	});

	it('gets node without relationships', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
			someString: 'name1',
			someDocument: 'Fake Document',
		});
		await testHeadRequest(`/v2/node/MainType/${mainCode}`, 200);
	});

	it('gets node with relationships', async () => {
		const [main, child, parent] = await sandbox.createNodes(
			['MainType', mainCode],
			['ChildType', `${namespace}-child`],
			['ParentType', `${namespace}-parent`],
		);
		await sandbox.connectNodes(
			// tests incoming and outgoing relationships
			[main, 'HAS_CHILD', child],
			[parent, 'IS_PARENT_OF', main],
		);

		return testHeadRequest(`/v2/node/MainType/${mainCode}`, 200);
	});

	it('responds with 404 if no node', async () => {
		return testHeadRequest(`/v2/node/MainType/${mainCode}`, 404);
	});

	it('responds with 500 if neo4j query fails', async () => {
		stubDbUnavailable(sandbox);
		return testHeadRequest(`/v2/node/MainType/${mainCode}`, 500);
	});
});

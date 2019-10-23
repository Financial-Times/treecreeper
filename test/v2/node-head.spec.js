const app = require('../../server/app.js');

const { setupMocks, stubDbUnavailable } = require('../helpers');

describe('v2 - node HEAD', () => {
	const sandbox = {};

	const namespace = 'v2-node-get';
	setupMocks(sandbox, { namespace });

	const testHeadRequest = (url, ...expectations) =>
		sandbox
			.request(app)
			.head(url)
			.namespacedAuth()
			.expect(...expectations);

	it('gets node without relationships', async () => {
		await sandbox.createNode('System', {
			code: `${namespace}-system`,
			name: 'name1',
			troubleshooting: 'Fake Document',
		});
		await testHeadRequest(`/v2/node/System/${namespace}-system`, 200);
	});

	it('gets node with relationships', async () => {
		const [system, person, product] = await sandbox.createNodes(
			['System', `${namespace}-system`],
			['Person', `${namespace}-person`],
			['Product', `${namespace}-product`],
		);
		await sandbox.connectNodes(
			// tests incoming and outgoing relationships
			[system, 'HAS_TECHNICAL_OWNER', person],
			[product, 'DEPENDS_ON', system],
		);

		await testHeadRequest(`/v2/node/System/${namespace}-system`, 200);
	});

	it('responds with 404 if no node', async () => {
		return testHeadRequest(`/v2/node/Team/${namespace}-team`, 404);
	});

	it('responds with 500 if neo4j query fails', async () => {
		stubDbUnavailable(sandbox);
		return testHeadRequest(`/v2/node/Team/${namespace}-team`, 500);
	});
});

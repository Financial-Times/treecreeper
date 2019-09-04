const app = require('../../server/app.js');

const {
	setupMocks,
	stubDbUnavailable,
	stubS3Unavailable,
} = require('../helpers');

describe('v2 - node GET', () => {
	const sandbox = {};

	const namespace = 'v2-node-get';
	setupMocks(sandbox, { namespace });

	const testGetRequest = (url, ...expectations) =>
		sandbox
			.request(app)
			.get(url)
			.namespacedAuth()
			.expect(...expectations);

	it('gets node without relationships', async () => {
		await sandbox.createNode('System', {
			code: `${namespace}-system`,
			name: 'name1',
			troubleshooting: 'Fake Document',
		});
		await testGetRequest(
			`/v2/node/System/${namespace}-system`,
			200,
			sandbox.withMeta({
				code: `${namespace}-system`,
				name: 'name1',
				troubleshooting: 'Fake Document',
			}),
		);
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
		sandbox.expectS3Actions({
			action: 'get',
			nodeType: 'System',
			code: `${namespace}-system`,
		});
	});

	it('gets node with relationships and document properties', async () => {
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

		return testGetRequest(
			`/v2/node/System/${namespace}-system`,
			200,
			sandbox.withMeta({
				code: `${namespace}-system`,
				dependentProducts: [`${namespace}-product`],
				technicalOwner: `${namespace}-person`,
				troubleshooting: 'Fake Document',
			}),
		);
	});

	it('responds with 404 if no node', async () => {
		return testGetRequest(`/v2/node/Team/${namespace}-team`, 404);
	});

	it('responds with 500 if neo4j query fails', async () => {
		stubDbUnavailable(sandbox);
		return testGetRequest(`/v2/node/Team/${namespace}-team`, 500);
	});

	it('responds with 500 if s3 query fails', async () => {
		stubS3Unavailable(sandbox);
		return testGetRequest(`/v2/node/System/${namespace}-system`, 500);
	});
});

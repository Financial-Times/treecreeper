const app = require('../../server/app.js');

const { setupMocks, stubDbUnavailable } = require('../helpers');

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
		// Check that documents are retrieved from neo4j - remove after S3 migration
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
	});

	it('gets node with relationships', async () => {
		const [team, person, group] = await sandbox.createNodes(
			['Team', `${namespace}-team`],
			['Person', `${namespace}-person`],
			['Group', `${namespace}-group`],
		);
		await sandbox.connectNodes(
			// tests incoming and outgoing relationships
			[group, 'HAS_TEAM', team],
			[team, 'HAS_TECH_LEAD', person],
		);

		return testGetRequest(
			`/v2/node/Team/${namespace}-team`,
			200,
			sandbox.withMeta({
				code: `${namespace}-team`,
				techLeads: [`${namespace}-person`],
				parentGroup: `${namespace}-group`,
			}),
		);
	});

	it('responds with 404 if no node', async () => {
		return testGetRequest(`/v2/node/Team/${namespace}-team`, 404);
	});

	it('responds with 500 if query fails', async () => {
		stubDbUnavailable(sandbox);
		return testGetRequest(`/v2/node/Team/${namespace}-team`, 500);
	});
});

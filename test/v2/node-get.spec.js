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

	it('gets node with document properties', async () => {});

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

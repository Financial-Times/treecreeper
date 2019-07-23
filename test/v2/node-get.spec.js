const app = require('../../server/app.js');

const { setupMocks, stubDbUnavailable } = require('../helpers');

describe('v2 - node GET', () => {
	const sandbox = {};

	const namespace = 'v2-node-get';
	setupMocks(sandbox, { namespace });

	const testGetRequest = (...expectations) =>
		sandbox
			.request(app)
			.get(`/v2/node/Team/${namespace}-team`)
			.namespacedAuth()
			.expect(...expectations);

	it('gets node without relationships', async () => {
		await sandbox.createNode('Team', {
			code: `${namespace}-team`,
			name: 'name1',
		});
		return testGetRequest(
			200,
			sandbox.withMeta({
				code: `${namespace}-team`,
				name: 'name1',
			}),
		);
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
			200,
			sandbox.withMeta({
				code: `${namespace}-team`,
				techLeads: [`${namespace}-person`],
				parentGroup: `${namespace}-group`,
			}),
		);
	});

	it('responds with 404 if no node', async () => {
		return testGetRequest(404);
	});

	it('responds with 500 if query fails', async () => {
		stubDbUnavailable(sandbox);
		return testGetRequest(500);
	});
});

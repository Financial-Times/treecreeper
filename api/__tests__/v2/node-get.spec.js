const app = require('../../server/app.js');

const {
	setupMocks,
	stubDbUnavailable,
	stubS3Unavailable,
} = require('../helpers');

describe('v2 - node GET', () => {
	const sandbox = {};

	const namespace = 'v2-node-get';
	const rootTypeCode = `${namespace}-root-type`;
	setupMocks(sandbox, { namespace });

	const testGetRequest = (url, ...expectations) =>
		sandbox
			.request(app)
			.get(url)
			.namespacedAuth()
			.expect(...expectations);

	it('gets node without relationships', async () => {
		sandbox.setS3Responses({ get: { someDocument: 'Fake Document' } });
		await sandbox.createNode('RootType', {
			code: rootTypeCode,
			someString: 'name1',
			someDocument: 'Fake Document',
		});
		await testGetRequest(
			`/v2/node/RootType/${rootTypeCode}`,
			200,
			sandbox.withMeta({
				code: rootTypeCode,
				someString: 'name1',
				someDocument: 'Fake Document',
			}),
		);
		sandbox.expectNoS3Actions('upload', 'delete', 'patch');
		sandbox.expectS3Actions({
			action: 'get',
			nodeType: 'RootType',
			code: rootTypeCode,
		});
	});

	it('gets node with relationships', async () => {
		const [rootType, childType, parentType] = await sandbox.createNodes(
			['RootType', rootTypeCode],
			['ChildType', `${namespace}-child`],
			['ParentType', `${namespace}-parent`],
		);
		await sandbox.connectNodes(
			// tests incoming and outgoing relationships
			[rootType, 'HAS_CHILD', childType],
			[parentType, 'HAS_ROOT_CHILD', rootType],
		);

		return testGetRequest(
			`/v2/node/RootType/${rootTypeCode}`,
			200,
			sandbox.withMeta({
				code: rootTypeCode,
				parents: [`${namespace}-parent`],
				children: [`${namespace}-child`],
			}),
		);
	});

	it('responds with 404 if no node', async () => {
		return testGetRequest(`/v2/node/RootType/${rootTypeCode}`, 404);
	});

	it('responds with 500 if neo4j query fails', async () => {
		stubDbUnavailable(sandbox);
		return testGetRequest(`/v2/node/RootType/${rootTypeCode}`, 500);
	});

	it('responds with 500 if s3 query fails', async () => {
		stubS3Unavailable(sandbox);
		return testGetRequest(`/v2/node/RootType/${rootTypeCode}`, 500);
	});
});

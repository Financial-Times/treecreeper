const { getHandler } = require('..');

const { setupMocks, stubDbUnavailable } = require('../../../test-helpers');

describe('v2 - node GET', () => {
	const sandbox = {};

	const namespace = 'v2-node-get';
	const mainCode = `${namespace}-main`;

	setupMocks(sandbox, { namespace });

	it('gets node without relationships', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
			someString: 'name1',
		});
		const { body, status } = await getHandler()({
			type: 'MainType',
			code: mainCode,
		});

		expect(status).toBe(200);
		expect(body).toEqual(
			sandbox.addMeta({
				code: mainCode,
				someString: 'name1',
			}),
		);
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

		const { body, status } = await getHandler()({
			type: 'MainType',
			code: mainCode,
		});
		expect(status).toBe(200);
		expect(body).toEqual(
			sandbox.addMeta({
				code: mainCode,
				parents: [`${namespace}-parent`],
				children: [`${namespace}-child`],
			}),
		);
	});

	it('gets node with Documents', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
		});

		const { body, status } = await getHandler({
			documentStore: {
				get: jest.fn(async () => ({
					someDocument: 'document',
				})),
			},
		})({ type: 'MainType', code: mainCode });

		expect(status).toBe(200);
		expect(body).toEqual(
			sandbox.addMeta({
				code: mainCode,
				someDocument: 'document',
			}),
		);
	});

	it('throws 404 error if no node', async () => {
		await expect(getHandler()({
			type: 'MainType',
			code: mainCode,
		})).rejects.toThrow({status: 404, message: 'MainType v2-node-get-main does not exist'})
	});

	it('throws if neo4j query fails', async () => {
		stubDbUnavailable(sandbox);
		await expect(getHandler()({
			type: 'MainType',
			code: mainCode,
		})).rejects.toThrow('oh no')
	});

	it('throws if s3 query fails', async () => {
		const handler = getHandler({
			documentStore: {
				get: jest.fn(async () => {
					throw new Error('oh no');
				}),
			},
		})

		await expect(handler({
			type: 'MainType',
			code: mainCode,
		})).rejects.toThrow('oh no')
	});
});

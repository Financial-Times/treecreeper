const { setupMocks } = require('../../../test-helpers');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');
const { getHandler } = require('../get');

describe('rest HEAD', () => {
	const namespace = 'api-rest-handlers-head';
	const mainCode = `${namespace}-main`;
	const input = {
		type: 'SimpleGraphBranch',
		code: mainCode,
	};

	const { createNodes, createNode, connectNodes } = setupMocks(namespace);

	const createMainNode = (props = {}) =>
		createNode('SimpleGraphBranch', { code: mainCode, ...props });

	it('gets record without relationships', async () => {
		await createMainNode({
			stringProperty: 'name1',
		});
		const { status } = await getHandler()(input);

		expect(status).toBe(200);
	});

	it('gets record with relationships', async () => {
		const [main, child, parent] = await createNodes(
			['SimpleGraphBranch', mainCode],
			['SimpleGraphLeaf', `${namespace}-child`],
			['SimpleGraphBranch', `${namespace}-parent`],
		);
		await connectNodes(
			// tests incoming and outgoing relationships
			[main, 'HAS_LEAF', child],
			[parent, 'HAS_CHILD', main],
		);

		const { status } = await getHandler()(input);
		expect(status).toBe(200);
	});

	it('throws 404 error if no record', async () => {
		await expect(getHandler()(input)).rejects.httpError({
			status: 404,
			message: `SimpleGraphBranch ${mainCode} does not exist`,
		});
	});

	it('throws if neo4j query fails', async () => {
		dbUnavailable();
		await expect(getHandler()(input)).rejects.toThrow('oh no');
	});
});

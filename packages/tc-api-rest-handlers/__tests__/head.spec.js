const { setupMocks } = require('@financial-times/tc-test-helpers');
const {
	dbUnavailable,
} = require('@financial-times/tc-test-helpers/error-stubs');
const { getHandler } = require('../get');

describe('rest HEAD', () => {
	const namespace = 'api-rest-handlers-head';
	const mainCode = `${namespace}-main`;
	const input = {
		type: 'MainType',
		code: mainCode,
	};

	const { createNodes, createNode, connectNodes } = setupMocks(namespace);

	const createMainNode = (props = {}) =>
		createNode('MainType', { code: mainCode, ...props });

	it('gets record without relationships', async () => {
		await createMainNode({
			someString: 'name1',
		});
		const { status } = await getHandler()(input);

		expect(status).toBe(200);
	});

	it('gets record with relationships', async () => {
		const [main, child, parent] = await createNodes(
			['MainType', mainCode],
			['ChildType', `${namespace}-child`],
			['ParentType', `${namespace}-parent`],
		);
		await connectNodes(
			// tests incoming and outgoing relationships
			[main, 'HAS_CHILD', child],
			[parent, 'IS_PARENT_OF', main],
		);

		const { status } = await getHandler()(input);
		expect(status).toBe(200);
	});

	it('throws 404 error if no record', async () => {
		await expect(getHandler()(input)).rejects.httpError({
			status: 404,
			message: `MainType ${mainCode} does not exist`,
		});
	});

	it('throws if neo4j query fails', async () => {
		dbUnavailable();
		await expect(getHandler()(input)).rejects.toThrow('oh no');
	});
});

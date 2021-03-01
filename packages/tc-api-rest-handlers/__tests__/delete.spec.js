const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');
const { deleteHandler } = require('../delete');

describe('rest DELETE', () => {
	const namespace = 'api-rest-handlers-delete';
	const mainCode = `${namespace}-main`;
	const input = {
		type: 'SimpleGraphBranch',
		code: mainCode,
	};

	const { createNodes, createNode, connectNodes } = setupMocks(namespace);

	it('deletes record without relationships', async () => {
		await createNode('SimpleGraphBranch', { code: mainCode });
		const { status } = await deleteHandler()(input);

		expect(status).toBe(204);
		await neo4jTest('SimpleGraphBranch', mainCode).notExists();
	});

	it('errors when deleting record with relationships', async () => {
		const [main, child, parent] = await createNodes(
			['SimpleGraphBranch', mainCode],
			['LeafType', `${namespace}-leaf`],
			['SimpleGraphBranch', `${namespace}-parent`],
		);
		await connectNodes(
			// tests incoming and outgoing relationships
			[main, 'HAS_LEAF', child],
			[parent, 'HAS_CHILD', main],
		);

		await expect(deleteHandler()(input)).rejects.httpError({
			status: 409,
			message: `Cannot delete - SimpleGraphBranch ${mainCode} has relationships.`,
		});
		await neo4jTest('SimpleGraphBranch', mainCode).exists();
	});

	it('deletes record with relationships when force=true', async () => {
		const [main, child, parent] = await createNodes(
			['SimpleGraphBranch', mainCode],
			['LeafType', `${namespace}-leaf`],
			['SimpleGraphBranch', `${namespace}-parent`],
		);
		await connectNodes(
			// tests incoming and outgoing relationships
			[main, 'HAS_LEAF', child],
			[parent, 'HAS_CHILD', main],
		);

		const { status } = await deleteHandler()({
			...input,
			query: { force: true },
		});

		expect(status).toBe(204);
		await neo4jTest('SimpleGraphBranch', mainCode).notExists();
	});

	it('throws 404 error if no record', async () => {
		await expect(deleteHandler()(input)).rejects.httpError({
			status: 404,
			message: `SimpleGraphBranch ${mainCode} does not exist`,
		});
	});

	it('throws if neo4j query fails', async () => {
		dbUnavailable();
		await expect(deleteHandler()(input)).rejects.toThrow('oh no');
	});
});

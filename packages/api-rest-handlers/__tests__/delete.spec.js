const { deleteHandler } = require('../delete');

const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');

describe('rest DELETE', () => {
	const namespace = 'api-rest-handlers-delete';
	const mainCode = `${namespace}-main`;
	const input = {
		type: 'MainType',
		code: mainCode,
	};

	const { createNodes, createNode, connectNodes } = setupMocks(namespace);

	const createMainNode = (props = {}) =>
		createNode('MainType', Object.assign({ code: mainCode }, props));

	it('deletes record without relationships', async () => {
		await createMainNode();
		const { status } = await deleteHandler()(input);

		expect(status).toBe(204);
		await neo4jTest('MainType', mainCode).notExists();
	});

	it('errors when deleting record with relationships', async () => {
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

		await expect(deleteHandler()(input)).rejects.toThrow({
			status: 400,
			message: `Cannot delete - MainType ${mainCode} has relationships.`,
		});
		await neo4jTest('MainType', mainCode).exists();
	});

	it('throws 404 error if no record', async () => {
		await expect(deleteHandler()(input)).rejects.toThrow({
			status: 404,
			message: `MainType ${mainCode} does not exist`,
		});
	});

	it('throws if neo4j query fails', async () => {
		dbUnavailable();
		await expect(deleteHandler()(input)).rejects.toThrow('oh no');
	});
});

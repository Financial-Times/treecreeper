const { deleteHandler } = require('..');

const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { securityTests } = require('../../../test-helpers/security');
const {
	dbUnavailable,
	asyncErrorFunction,
} = require('../../../test-helpers/error-stubs');

describe('rest DELETE', () => {
	const namespace = 'api-rest-delete-handler';
	const mainCode = `${namespace}-main`;
	const input = {
		type: 'MainType',
		code: mainCode,
	};

	const { createNodes, createNode, connectNodes } = setupMocks(namespace);

	const createMainNode = (props = {}) =>
		createNode('MainType', Object.assign({ code: mainCode }, props));

	securityTests(deleteHandler(), mainCode);

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

	it('deletes record with Documents', async () => {
		const deleteMock = jest.fn(async () => 'delete-marker');
		await createMainNode();

		const { status } = await deleteHandler({
			documentStore: {
				delete: deleteMock,
			},
		})(input);

		expect(status).toBe(204);
		await neo4jTest('MainType', mainCode).notExists();
		expect(deleteMock).toHaveBeenCalledWith('MainType', mainCode);
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
		await neo4jTest('MainType', mainCode).exists();
	});

	it('throws if s3 query fails', async () => {
		await createMainNode();
		await expect(
			deleteHandler({
				documentStore: {
					delete: asyncErrorFunction,
				},
			})(input),
		).rejects.toThrow('oh no');
		await neo4jTest('MainType', mainCode).exists();
	});

	it('undoes any s3 actions if neo4j query fails', async () => {
		const deleteMock = jest.fn(async () => 'delete-marker');
		await createMainNode();
		dbUnavailable({ skip: 1 });
		await expect(
			deleteHandler({
				documentStore: {
					delete: deleteMock,
				},
			})(input),
		).rejects.toThrow('oh no');
		expect(deleteMock).toHaveBeenCalledWith(
			'MainType',
			mainCode,
			'delete-marker',
		);
		await neo4jTest('MainType', mainCode).exists();
	});
});

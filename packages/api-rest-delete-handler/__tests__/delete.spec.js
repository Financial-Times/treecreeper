const { deleteHandler } = require('..');

const {
	setupMocks,
	verifyNotExists,
	verifyExists,
} = require('../../../test-helpers');
const { securityTests } = require('../../../test-helpers/security');
const {
	dbUnavailable,
	asyncErrorFunction,
} = require('../../../test-helpers/error-stubs');

describe('rest DELETE', () => {
	const sandbox = {};

	const namespace = 'delete';
	const mainCode = `${namespace}-main`;
	const input = {
		type: 'MainType',
		code: mainCode,
	};

	setupMocks(sandbox, { namespace });

	securityTests(deleteHandler(), mainCode);

	it('deletes record without relationships', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
			someString: 'name1',
		});
		const { status } = await deleteHandler()(input);

		expect(status).toBe(204);
		await verifyNotExists('MainType', mainCode);
	});

	it('errors when deleting record with relationships', async () => {
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

		expect(deleteHandler()(input)).rejects.toThrow({
			status: 400,
			message: `Cannot delete - MainType ${mainCode} has relationships.`,
		});
	});

	it('deletes record with Documents', async () => {
		const deleteMock = jest.fn(async () => 'delete-marker');
		await sandbox.createNode('MainType', {
			code: mainCode,
		});

		const { status } = await deleteHandler({
			documentStore: {
				delete: deleteMock,
			},
		})(input);

		expect(status).toBe(204);
		await verifyNotExists('MainType', mainCode);
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
	});

	it('throws if s3 query fails', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
		});
		await expect(
			deleteHandler({
				documentStore: {
					delete: asyncErrorFunction,
				},
			})(input),
		).rejects.toThrow('oh no');
	});

	it('undoes any s3 actions if neo4j query fails', async () => {
		const deleteMock = jest.fn(async () => 'delete-marker');
		await sandbox.createNode('MainType', {
			code: mainCode,
		});
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
	});
});

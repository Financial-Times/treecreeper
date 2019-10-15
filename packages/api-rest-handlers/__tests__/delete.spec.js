const { deleteHandler } = require('../delete');

const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { securityTests } = require('../../../test-helpers/security');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');
const { docstore } = require('../../api-s3-document-store');

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

	securityTests(deleteHandler(), mainCode);

	const documentStore = docstore();
	let documentStoreSpy;
	beforeEach(() => {
		documentStoreSpy = jest
			.spyOn(documentStore, 'delete')
			.mockResolvedValue({
				versionMarker: 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar',
			});
	});
	afterEach(() => {
		jest.resetAllMocks();
	});

	it('deletes record without relationships', async () => {
		await createMainNode();
		const { status } = await deleteHandler({ documentStore })(input);

		expect(status).toBe(204);
		expect(documentStoreSpy).toHaveBeenCalled();
		expect(documentStoreSpy).toHaveBeenCalledWith('MainType', mainCode);
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

		await expect(deleteHandler({ documentStore })(input)).rejects.toThrow({
			status: 400,
			message: `Cannot delete - MainType ${mainCode} has relationships.`,
		});
		// documentStore.delete won't be called because neo4j raise error
		expect(documentStoreSpy).not.toHaveBeenCalled();
		await neo4jTest('MainType', mainCode).exists();
	});

	it('throws 404 error if no record', async () => {
		await expect(deleteHandler({ documentStore })(input)).rejects.toThrow({
			status: 404,
			message: `MainType ${mainCode} does not exist`,
		});
		expect(documentStoreSpy).not.toHaveBeenCalled();
	});

	it('throws if neo4j query fails', async () => {
		dbUnavailable();
		await expect(deleteHandler({ documentStore })(input)).rejects.toThrow(
			'oh no',
		);
		expect(documentStoreSpy).not.toHaveBeenCalled();
	});
});

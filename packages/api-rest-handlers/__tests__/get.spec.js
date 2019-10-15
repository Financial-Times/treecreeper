const { getHandler } = require('../get');
const { setupMocks } = require('../../../test-helpers');
const { securityTests } = require('../../../test-helpers/security');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');
const { docstore } = require('../../api-s3-document-store');

describe('rest GET', () => {
	const namespace = 'api-rest-handlers-get';
	const mainCode = `${namespace}-main`;
	const input = {
		type: 'MainType',
		code: mainCode,
	};

	const { createNodes, createNode, connectNodes, meta } = setupMocks(
		namespace,
	);

	const createMainNode = (props = {}) =>
		createNode('MainType', Object.assign({ code: mainCode }, props));

	securityTests(getHandler(), mainCode);

	const documentStore = docstore();
	let documentStoreSpy;
	beforeEach(() => {
		documentStoreSpy = jest.spyOn(documentStore, 'get').mockResolvedValue({
			body: { some: 'field' },
		});
	});
	afterEach(() => {
		jest.resetAllMocks();
	});

	it('gets record without relationships', async () => {
		await createMainNode({
			someString: 'name1',
		});
		const { body, status } = await getHandler({ documentStore })(input);

		expect(status).toBe(200);
		expect(body).toMatchObject({ code: mainCode, someString: 'name1' });
		expect(documentStoreSpy).toHaveBeenCalled();
		expect(documentStoreSpy).toHaveBeenCalledWith('MainType', mainCode);
	});

	it('retrieves metadata', async () => {
		await createMainNode();
		const { body, status } = await getHandler({ documentStore })(input);

		expect(status).toBe(200);
		expect(body).toMatchObject(meta.default);
		expect(documentStoreSpy).toHaveBeenCalled();
		expect(documentStoreSpy).toHaveBeenCalledWith('MainType', mainCode);
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

		const { body, status } = await getHandler({ documentStore })(input);
		expect(status).toBe(200);
		expect(body).toMatchObject({
			code: mainCode,
			parents: [`${namespace}-parent`],
			children: [`${namespace}-child`],
		});
		expect(documentStoreSpy).toHaveBeenCalled();
		expect(documentStoreSpy).toHaveBeenCalledWith('MainType', mainCode);
	});

	it('throws 404 error if no record', async () => {
		await expect(getHandler({ documentStore })(input)).rejects.toThrow({
			status: 404,
			message: `MainType ${mainCode} does not exist`,
		});
	});

	it('throws if neo4j query fails', async () => {
		dbUnavailable();
		await expect(getHandler({ documentStore })(input)).rejects.toThrow(
			'oh no',
		);
	});
});

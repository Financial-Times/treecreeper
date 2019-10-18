const { getHandler } = require('../get');
const { setupMocks } = require('../../../test-helpers');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');

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

	it('gets record without relationships', async () => {
		await createMainNode({
			someString: 'name1',
		});
		const { body, status } = await getHandler()(input);

		expect(status).toBe(200);
		expect(body).toMatchObject({ code: mainCode, someString: 'name1' });
	});

	it('retrieves metadata', async () => {
		await createMainNode();
		const { body, status } = await getHandler()(input);

		expect(status).toBe(200);
		expect(body).toMatchObject(meta.default);
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

		const { body, status } = await getHandler()(input);
		expect(status).toBe(200);
		expect(body).toMatchObject({
			code: mainCode,
			parents: [`${namespace}-parent`],
			children: [`${namespace}-child`],
		});
	});

	it('throws 404 error if no record', async () => {
		await expect(getHandler()(input)).rejects.toThrow({
			status: 404,
			message: `MainType ${mainCode} does not exist`,
		});
	});

	it('throws if neo4j query fails', async () => {
		dbUnavailable();
		await expect(getHandler()(input)).rejects.toThrow('oh no');
	});
});

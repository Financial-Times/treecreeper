jest.mock('@financial-times/tc-api-publish');
const apiPublish = require('@financial-times/tc-api-publish');
const { setupMocks, neo4jTest } = require('@financial-times/tc-test-helpers');
const {
	deleteHandler,
	postHandler,
	patchHandler,
	absorbHandler,
} = require('..');

describe('Rest logChanges module integration', () => {
	const namespace = 'api-rest-handlers-logchanges';
	const mainCode = `${namespace}-main`;
	const mainType = 'MainType';
	const otherCode = `${namespace}-other`;
	const input = {
		type: mainType,
		code: mainCode,
	};

	const getInput = body => ({
		type: mainType,
		code: mainCode,
		body,
	});

	const { createNode, createNodes, connectNodes } = setupMocks(namespace);
	const createMainNode = (props = {}) =>
		createNode('MainType', { code: mainCode, ...props });

	const createLogChangeMock = () =>
		jest.spyOn(apiPublish, 'logChanges').mockResolvedValue({});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('DELETE', () => {
		it('will send DELETE log', async () => {
			await createMainNode();
			const logChangesMock = createLogChangeMock();

			const { status } = await deleteHandler()(input);

			expect(status).toBe(204);
			expect(logChangesMock).toHaveBeenCalledTimes(1);
			expect(logChangesMock).toHaveBeenCalledWith(
				'DELETE',
				expect.any(Object),
			);
			await neo4jTest('MainType', mainCode).notExists();
		});
	});

	describe('POST', () => {
		it('will send CREATE log', async () => {
			const logChangesMock = createLogChangeMock();

			const { status } = await postHandler()(
				getInput({
					someString: 'some string',
				}),
			);

			expect(status).toBe(200);
			expect(logChangesMock).toHaveBeenCalledTimes(1);
			expect(logChangesMock).toHaveBeenCalledWith(
				'CREATE',
				expect.any(Object),
				{
					relationships: {
						added: expect.any(Object),
					},
				},
			);
		});
	});

	describe('PATCH create', () => {
		it("will send CREATE logs when node doesn't exist", async () => {
			const logChangesMock = createLogChangeMock();

			const { status } = await patchHandler()(
				getInput({
					someString: 'some string',
				}),
			);

			expect(status).toBe(201);
			expect(logChangesMock).toHaveBeenCalledTimes(1);
			expect(logChangesMock).toHaveBeenCalledWith(
				'CREATE',
				expect.any(Object),
				{
					relationships: {
						added: expect.any(Object),
					},
				},
			);
		});

		it('will send UPDATE logs when node already exists', async () => {
			await createMainNode();
			const logChangesMock = createLogChangeMock();

			const { status } = await patchHandler()(
				getInput({
					someString: 'some string',
					anotherString: 'another string',
				}),
			);

			expect(status).toBe(200);
			expect(logChangesMock).toHaveBeenCalledTimes(1);
			expect(logChangesMock).toHaveBeenCalledWith(
				'UPDATE',
				expect.any(Object),
				{
					relationships: {
						added: expect.any(Object),
						removed: expect.any(Object),
					},
				},
			);
		});
	});

	describe('ABSORB', () => {
		it('will send UPDATE and DELETE log twice', async () => {
			const [main, other] = await createNodes(
				[mainType, mainCode],
				[mainType, otherCode],
			);
			await connectNodes([main, 'HAS_YOUNGER_SIBLING', other]);

			const logChangesMock = createLogChangeMock();

			const { status } = await absorbHandler()(
				Object.assign(
					getInput({
						someString: 'some string',
						anotherString: 'another string',
					}),
					{
						codeToAbsorb: otherCode,
					},
				),
			);

			expect(status).toBe(200);
			expect(logChangesMock).toHaveBeenCalledTimes(2);
			expect(logChangesMock).toHaveBeenNthCalledWith(
				1,
				'UPDATE',
				expect.any(Object),
				{
					relationships: {
						removed: {
							olderSiblings: [mainCode],
						},
					},
				},
			);
			expect(logChangesMock).toHaveBeenNthCalledWith(
				2,
				'DELETE',
				expect.any(Object),
			);
		});
	});
});

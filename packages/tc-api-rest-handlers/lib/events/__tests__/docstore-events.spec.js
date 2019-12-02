// sent props from docstore
// send event when only update is docstore

// jest.mock('..');
// const events = require('..');
// const { setupMocks, neo4jTest } = require('../../../../../test-helpers');
// const {
// 	deleteHandler,
// 	postHandler,
// 	patchHandler,
// 	absorbHandler,
// } = require('../../../');

// describe('Rest events docstore integration', () => {
// 	const namespace = 'api-rest-handlers-docstore-events';
// 	const mainCode = `${namespace}-main`;
// 	const mainType = 'MainType';
// 	const otherCode = `${namespace}-other`;
// 	const input = {
// 		type: mainType,
// 		code: mainCode,
// 	};

// 	const getInput = body => ({
// 		type: mainType,
// 		code: mainCode,
// 		body,
// 	});

// 	const { createNode, createNodes, connectNodes } = setupMocks(namespace);
// 	const createMainNode = (props = {}) =>
// 		createNode('MainType', { code: mainCode, ...props });

// 	const createBroadcastMock = () =>
// 		jest.spyOn(events, 'broadcast').mockResolvedValue({});

// 	afterEach(() => {
// 		jest.resetAllMocks();
// 	});

// 	describe('POST', () => {
// 		it('will include document properties on CREATE log', async () => {
// 			const broadcastMock = createBroadcastMock();

// 			const { status } = await postHandler({
// 				documentStore: {
// 					post: () => {body: {someDocument: 'some document'}, undo : () => null},
// 				}
// 			})(
// 				getInput({
// 					someString: 'some string',
// 					someDocument: 'some document',
// 				}),
// 			);

// 			expect(status).toBe(200);
// 			expect(broadcastMock).toHaveBeenCalledTimes(1);
// 			expect(broadcastMock).toHaveBeenCalledWith(
// 				'CREATE',
// 				expect.any(Object),
// 				{
// 					relationships: {
// 						added: expect.any(Object),
// 					},
// 				},
// 			);
// 		});
// 	});

// 	describe('PATCH create', () => {

// 		it("will include document properties on CREATE log when node doesn't exist", async () => {
// 			const broadcastMock = createBroadcastMock();

// 			const { status } = await patchHandler({

// 			})(
// 				getInput({
// 					someString: 'some string',
// 				}),
// 			);

// 			expect(status).toBe(201);
// 			expect(broadcastMock).toHaveBeenCalledTimes(1);
// 			expect(broadcastMock).toHaveBeenCalledWith(
// 				'CREATE',
// 				expect.any(Object),
// 				{
// 					relationships: {
// 						added: expect.any(Object),
// 					},
// 				},
// 			);
// 		});

// 		it('will include document properties on UPDATE log when node already exists', async () => {
// 			await createMainNode();
// 			const broadcastMock = createBroadcastMock();

// 			const { status } = await patchHandler()(
// 				getInput({
// 					someString: 'some string',
// 					anotherString: 'another string',
// 				}),
// 			);

// 			expect(status).toBe(200);
// 			expect(broadcastMock).toHaveBeenCalledTimes(1);
// 			expect(broadcastMock).toHaveBeenCalledWith(
// 				'UPDATE',
// 				expect.any(Object),
// 				{
// 					relationships: {
// 						added: expect.any(Object),
// 						removed: expect.any(Object),
// 					},
// 				},
// 			);
// 		});
// 	});

// 	describe('ABSORB', () => {
// 		it('will include document properties on UPDATE log', async () => {
// 			const [main, other] = await createNodes(
// 				[mainType, mainCode],
// 				[mainType, otherCode],
// 			);
// 			await connectNodes([main, 'HAS_YOUNGER_SIBLING', other]);

// 			const broadcastMock = createBroadcastMock();

// 			const { status } = await absorbHandler()(
// 				Object.assign(
// 					getInput({
// 						someString: 'some string',
// 						anotherString: 'another string',
// 					}),
// 					{
// 						codeToAbsorb: otherCode,
// 					},
// 				),
// 			);

// 			expect(status).toBe(200);
// 			expect(broadcastMock).toHaveBeenCalledTimes(2);
// 			expect(broadcastMock).toHaveBeenNthCalledWith(
// 				1,
// 				'UPDATE',
// 				expect.any(Object),
// 				{
// 					relationships: {
// 						removed: {
// 							olderSiblings: [mainCode],
// 						},
// 					},
// 				},
// 			);
// 			expect(broadcastMock).toHaveBeenNthCalledWith(
// 				2,
// 				'DELETE',
// 				expect.any(Object),
// 			);
// 		});
// 	});
// });

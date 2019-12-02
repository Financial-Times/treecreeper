const events = require('..');

const emitSpy = jest.fn();
events.emitter.emit = emitSpy;

const { setupMocks } = require('../../../../../test-helpers');
const {
	deleteHandler,
	postHandler,
	patchHandler,
	// absorbHandler,
} = require('../../..');

const eventTester = desiredAction => (type, code, updatedProperties) => {
	console.log(
		emitSpy.mock.calls,
		desiredAction,
		type,
		code,
		updatedProperties,
	);
	const matchingEvents = emitSpy.mock.calls.filter(
		([action, event]) =>
			action === desiredAction &&
			event.action === desiredAction &&
			event.type === type &&
			event.code === code,
	);
	expect(matchingEvents.length).toBe(1);
	const referenceObject = {
		action: desiredAction,
		type,
		// time: expect.any(Number),
		code,
	};
	if (updatedProperties) {
		referenceObject.updatedProperties = updatedProperties;
	}
	expect(matchingEvents[0][1]).toMatchObject(referenceObject);
};

const expectCreateEvent = eventTester('CREATE');
const expectUpdateEvent = eventTester('UPDATE');
const expectDeleteEvent = eventTester('DELETE');

describe('Rest events module integration', () => {
	const namespace = 'api-rest-handlers-broadcast';
	const mainCode = `${namespace}-main`;
	const mainType = 'MainType';
	const childType = 'ChildType';
	const childCode = `${namespace}-child`;
	const input = {
		type: mainType,
		code: mainCode,
	};

	const getInput = (body, query = {}) => ({
		type: mainType,
		code: mainCode,
		body,
		query,
		metadata: { requestId: `${namespace}-request-id` },
	});

	const { createNode, connectNodes } = setupMocks(namespace);
	const createMainNode = (props = {}) =>
		createNode('MainType', { code: mainCode, ...props });

	afterEach(() => {
		events.emitter.emit.mockClear();
	});

	describe('DELETE', () => {
		it('will send DELETE event', async () => {
			await createMainNode();
			const { status } = await deleteHandler()(input);

			expect(status).toBe(204);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectDeleteEvent(mainType, mainCode);
		});
	});

	describe('POST', () => {
		it('should send a CREATE event', async () => {
			const { status } = await postHandler()(
				getInput({
					someString: 'some string',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectCreateEvent(mainType, mainCode, ['code', 'someString']);
		});
		it('should send extra UPDATE events when connecting to related nodes', async () => {
			await createNode('ChildType', { code: childCode });
			const { status } = await postHandler()(
				getInput({
					someString: 'some string',
					children: [childCode],
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectCreateEvent(mainType, mainCode, [
				'children',
				'code',
				'someString',
			]);
			expectUpdateEvent(childType, childCode, ['isChildOf']);
		});

		it('should send extra CREATE events when upserting to related nodes', async () => {
			const { status } = await postHandler()(
				getInput(
					{
						someString: 'some string',
						children: [childCode],
					},
					{ upsert: true },
				),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectCreateEvent(mainType, mainCode, [
				'children',
				'code',
				'someString',
			]);
			expectCreateEvent(childType, childCode, ['code', 'isChildOf']);
		});
	});

	describe('PATCH', () => {
		it("should send a CREATE event if record doesn't exist", async () => {
			const { status } = await patchHandler()(
				getInput({
					someString: 'some string',
				}),
			);

			expect(status).toBe(201);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectCreateEvent(mainType, mainCode, ['code', 'someString']);
		});

		it('should send an UPDATE event if record exists', async () => {
			await createMainNode();
			const { status } = await patchHandler()(
				getInput({
					someString: 'some string',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectUpdateEvent(mainType, mainCode, ['someString']);
		});
		it('should send extra UPDATE events when connecting to related nodes', async () => {
			await createNode(mainType, mainCode);
			await createNode(childType, childCode);
			const { status } = await patchHandler()(
				getInput(
					{
						someString: 'some string',
						children: [childCode],
					},
					{ relationshipAction: 'replace' },
				),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectUpdateEvent(mainType, mainCode, ['children', 'someString']);
			expectUpdateEvent(childType, childCode, ['isChildOf']);
		});

		it('should send extra CREATE events when upserting to related nodes', async () => {
			await createMainNode();
			const { status } = await patchHandler()(
				getInput(
					{
						someString: 'some string',
						children: [childCode],
					},
					{ upsert: true, relationshipAction: 'replace' },
				),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectUpdateEvent(mainType, mainCode, ['children', 'someString']);
			expectCreateEvent(childType, childCode, ['code', 'isChildOf']);
		});
		it('should send extra UPDATE events when disconnecting from related nodes', async () => {
			const [main, child] = await Promise.all([
				createMainNode(),
				createNode(childType, { code: childCode }),
			]);
			await connectNodes(main, 'HAS_CHILD', child);

			const { status } = await patchHandler()(
				getInput(
					{
						someString: 'some string',
						'!children': [childCode],
					},
					{ relationshipAction: 'replace' },
				),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectUpdateEvent(mainType, mainCode, ['children', 'someString']);
			expectUpdateEvent(childType, childCode, ['isChildOf']);
		});
	});

	describe('ABSORB', () => {
		// 		it('will send UPDATE and DELETE log twice', async () => {
		// 			const [main, other] = await createNodes(
		// 				[mainType, mainCode],
		// 				[mainType, otherCode],
		// 			);
		// 			await connectNodes([main, 'HAS_YOUNGER_SIBLING', other]);
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
	});
});

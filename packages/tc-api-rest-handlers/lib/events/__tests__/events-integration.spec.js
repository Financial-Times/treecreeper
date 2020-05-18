const events = require('..');

const emitSpy = jest.fn();
events.emitter.emit = emitSpy;

const { setupMocks } = require('../../../../../test-helpers');
const {
	deleteHandler,
	postHandler,
	patchHandler,
	absorbHandler,
} = require('../../..');

const eventTester = desiredAction => (type, code, updatedProperties) => {
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
	const absorbedCode = `${namespace}-absorbed`;
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
				'deprecatedChildren',
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
				'deprecatedChildren',
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
			expectUpdateEvent(mainType, mainCode, [
				'children',
				'deprecatedChildren',
				'someString',
			]);
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
			expectUpdateEvent(mainType, mainCode, [
				'children',
				'deprecatedChildren',
				'someString',
			]);
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
			expectUpdateEvent(mainType, mainCode, [
				'children',
				'deprecatedChildren',
				'someString',
			]);
			expectUpdateEvent(childType, childCode, ['isChildOf']);
		});

		it('should not send extra UPDATE events when making noop property removal edit to rich relationship', async () => {
			const [main, child] = await Promise.all([
				createMainNode(),
				createNode(childType, { code: childCode }),
			]);
			await connectNodes(main, 'HAS_CURIOUS_CHILD', child);

			const { status } = await patchHandler()(
				getInput(
					{
						someString: 'some string',
						curiousChild: {
							code: childCode,
							someString: null,
						},
					},
					{ relationshipAction: 'replace', upsert: true },
				),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectUpdateEvent(mainType, mainCode, ['someString']);
		});
	});

	describe('ABSORB', () => {
		it('should send DELETE and UPDATE events for main nodes', async () => {
			await Promise.all([
				createMainNode(),
				createNode(mainType, {
					code: absorbedCode,
					someString: 'some string',
				}),
			]);

			const { status } = await absorbHandler()({
				code: mainCode,
				type: mainType,
				codeToAbsorb: absorbedCode,
			});

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectUpdateEvent(mainType, mainCode, ['someString']);
			expectDeleteEvent(mainType, absorbedCode);
		});

		it('should send no update event if no real changes absorbed', async () => {
			await Promise.all([
				createNode(mainType, {
					code: mainCode,
					someString: 'some string',
				}),
				createNode(mainType, {
					code: absorbedCode,
					someString: 'some string',
				}),
			]);

			const { status } = await absorbHandler()({
				code: mainCode,
				type: mainType,
				codeToAbsorb: absorbedCode,
			});

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);

			expectDeleteEvent(mainType, absorbedCode);
		});
		it('should send extra update events when relationships are absorbed', async () => {
			const [, absorbed, child] = await Promise.all([
				createMainNode(),
				createNode(mainType, { code: absorbedCode }),
				createNode(childType, { code: childCode }),
			]);

			await connectNodes(absorbed, 'HAS_CHILD', child);

			const { status } = await absorbHandler()({
				code: mainCode,
				type: mainType,
				codeToAbsorb: absorbedCode,
			});

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(3);
			expectDeleteEvent(mainType, absorbedCode);
			expectUpdateEvent(mainType, mainCode, [
				'children',
				'deprecatedChildren',
			]);
			expectUpdateEvent(childType, childCode, ['isChildOf']);
		});

		it('should send extra update events for peers who lose relationships', async () => {
			const [main, absorbed, child] = await Promise.all([
				createMainNode(),
				createNode(mainType, { code: absorbedCode }),
				createNode(childType, { code: childCode }),
			]);

			await connectNodes(main, 'HAS_CHILD', child);
			await connectNodes(absorbed, 'HAS_CHILD', child);

			const { status } = await absorbHandler()({
				code: mainCode,
				type: mainType,
				codeToAbsorb: absorbedCode,
			});

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectDeleteEvent(mainType, absorbedCode);
			expectUpdateEvent(childType, childCode, ['isChildOf']);
		});

		it('should send no main update events when identical relationship is absorbed', async () => {
			const [main, absorbed, child] = await Promise.all([
				createMainNode(),
				createNode(mainType, { code: absorbedCode }),
				createNode(childType, { code: childCode }),
			]);

			await connectNodes(main, 'HAS_CHILD', child);
			await connectNodes(absorbed, 'HAS_CHILD', child);

			const { status } = await absorbHandler()({
				code: mainCode,
				type: mainType,
				codeToAbsorb: absorbedCode,
			});

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectDeleteEvent(mainType, absorbedCode);
			expectUpdateEvent(childType, childCode, ['isChildOf']);
		});
		it('should send update events when reflective relationships are absorbed', async () => {
			const [main, absorbed] = await Promise.all([
				createMainNode(),
				createNode(mainType, { code: absorbedCode }),
			]);

			await connectNodes(main, 'HAS_YOUNGER_SIBLING', absorbed);

			const { status } = await absorbHandler()({
				code: mainCode,
				type: mainType,
				codeToAbsorb: absorbedCode,
			});

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectDeleteEvent(mainType, absorbedCode);
			expectUpdateEvent(mainType, mainCode, ['youngerSiblings']);
		});
		it('should send no extra update events when N-to-1 relationships are absorbed', async () => {
			const [main, absorbed, child, child2] = await Promise.all([
				createMainNode(),
				createNode(mainType, { code: absorbedCode }),
				createNode(childType, { code: childCode }),
				createNode(childType, { code: childCode + 2 }),
			]);

			await connectNodes(main, 'HAS_FAVOURITE_CHILD', child);
			await connectNodes(absorbed, 'HAS_FAVOURITE_CHILD', child2);

			const { status } = await absorbHandler()({
				code: mainCode,
				type: mainType,
				codeToAbsorb: absorbedCode,
			});

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectDeleteEvent(mainType, absorbedCode);
			expectUpdateEvent(childType, childCode + 2, ['isFavouriteChildOf']);
		});
	});
});

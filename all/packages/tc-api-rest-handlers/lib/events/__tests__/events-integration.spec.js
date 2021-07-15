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
	const leafCode = `${namespace}-leaf`;
	const absorbedCode = `${namespace}-absorbed`;
	const input = {
		type: 'EventsTest',
		code: mainCode,
	};

	const getInput = (body, query = {}) => ({
		type: 'EventsTest',
		code: mainCode,
		body,
		query,
		metadata: { requestId: `${namespace}-request-id` },
	});

	const { createNode, connectNodes } = setupMocks(namespace);

	afterEach(() => {
		events.emitter.emit.mockClear();
	});

	describe('DELETE', () => {
		it('will send DELETE event', async () => {
			await createNode('EventsTest', { code: mainCode });
			const { status } = await deleteHandler()(input);

			expect(status).toBe(204);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectDeleteEvent('EventsTest', mainCode);
		});
		it('will send extra UPDATE events when connected to related nodes', async () => {
			const [main, leaf] = await Promise.all([
				createNode('EventsTest', { code: mainCode }),
				createNode('EventsTestLeaf', { code: leafCode }),
			]);
			await connectNodes(main, 'GENERIC_RELATIONSHIP', leaf);

			const { status } = await deleteHandler()({
				...input,
				query: { force: true },
			});

			expect(status).toBe(204);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectDeleteEvent('EventsTest', mainCode);
			expectUpdateEvent('EventsTestLeaf', leafCode, [
				'deprecatedEventEmitters',
				'eventEmitters',
			]);
		});
	});

	describe('POST', () => {
		it('should send a CREATE event', async () => {
			const { status } = await postHandler()(
				getInput({
					stringProperty: 'some string',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectCreateEvent('EventsTest', mainCode, [
				'code',
				'stringProperty',
			]);
		});
		it('should send extra UPDATE events when connecting to related nodes', async () => {
			await createNode('EventsTestLeaf', { code: leafCode });
			const { status } = await postHandler()(
				getInput({
					stringProperty: 'some string',
					relationshipProperty: [leafCode],
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectCreateEvent('EventsTest', mainCode, [
				'code',
				'deprecatedRelationshipProperty',
				'relationshipProperty',
				'stringProperty',
			]);
			expectUpdateEvent('EventsTestLeaf', leafCode, [
				'deprecatedEventEmitters',
				'eventEmitters',
			]);
		});

		it('should send extra CREATE events when upserting to related nodes', async () => {
			const { status } = await postHandler()(
				getInput(
					{
						stringProperty: 'some string',
						relationshipProperty: [leafCode],
					},
					{ upsert: true },
				),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectCreateEvent('EventsTest', mainCode, [
				'code',
				'deprecatedRelationshipProperty',
				'relationshipProperty',
				'stringProperty',
			]);
			expectCreateEvent('EventsTestLeaf', leafCode, [
				'code',
				'deprecatedEventEmitters',
				'eventEmitters',
			]);
		});
	});

	describe('PATCH', () => {
		it("should send a CREATE event if record doesn't exist", async () => {
			const { status } = await patchHandler()(
				getInput({
					stringProperty: 'some string',
				}),
			);

			expect(status).toBe(201);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectCreateEvent('EventsTest', mainCode, [
				'code',
				'stringProperty',
			]);
		});

		it('should send an UPDATE event if record exists', async () => {
			await createNode('EventsTest', { code: mainCode });
			const { status } = await patchHandler()(
				getInput({
					stringProperty: 'some string',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectUpdateEvent('EventsTest', mainCode, ['stringProperty']);
		});
		it('should send extra UPDATE events when connecting to related nodes', async () => {
			await createNode('EventsTest', mainCode);
			await createNode('EventsTestLeaf', leafCode);
			const { status } = await patchHandler()(
				getInput(
					{
						stringProperty: 'some string',
						relationshipProperty: [leafCode],
					},
					{ relationshipAction: 'replace' },
				),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectUpdateEvent('EventsTest', mainCode, [
				'deprecatedRelationshipProperty',
				'relationshipProperty',
				'stringProperty',
			]);
			expectUpdateEvent('EventsTestLeaf', leafCode, [
				'deprecatedEventEmitters',
				'eventEmitters',
			]);
		});

		it('should send extra CREATE events when upserting to related nodes', async () => {
			await createNode('EventsTest', { code: mainCode });
			const { status } = await patchHandler()(
				getInput(
					{
						stringProperty: 'some string',
						relationshipProperty: [leafCode],
					},
					{ upsert: true, relationshipAction: 'replace' },
				),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectUpdateEvent('EventsTest', mainCode, [
				'deprecatedRelationshipProperty',
				'relationshipProperty',
				'stringProperty',
			]);
			expectCreateEvent('EventsTestLeaf', leafCode, [
				'code',
				'deprecatedEventEmitters',
				'eventEmitters',
			]);
		});
		it('should send extra UPDATE events when disconnecting from related nodes', async () => {
			const [main, leaf] = await Promise.all([
				createNode('EventsTest', { code: mainCode }),
				createNode('EventsTestLeaf', { code: leafCode }),
			]);
			await connectNodes(main, 'GENERIC_RELATIONSHIP', leaf);

			const { status } = await patchHandler()(
				getInput(
					{
						stringProperty: 'some string',
						'!relationshipProperty': [leafCode],
					},
					{ relationshipAction: 'replace' },
				),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectUpdateEvent('EventsTest', mainCode, [
				'deprecatedRelationshipProperty',
				'relationshipProperty',
				'stringProperty',
			]);
			expectUpdateEvent('EventsTestLeaf', leafCode, [
				'deprecatedEventEmitters',
				'eventEmitters',
			]);
		});

		it('should not send extra UPDATE events when removing rich relationship property that was already non-existent', async () => {
			const [main, leaf] = await Promise.all([
				createNode('EventsTest', { code: mainCode }),
				createNode('EventsTestLeaf', { code: leafCode }),
			]);
			await connectNodes(main, 'GENERIC_RELATIONSHIP', leaf);

			const { status } = await patchHandler()(
				getInput(
					{
						stringProperty: 'some string',
						relationshipProperty: {
							code: leafCode,
							stringProperty: null,
						},
					},
					{ relationshipAction: 'replace', upsert: true },
				),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectUpdateEvent('EventsTest', mainCode, ['stringProperty']);
		});
	});

	describe('ABSORB', () => {
		it('should send DELETE and UPDATE events for main nodes', async () => {
			await Promise.all([
				createNode('EventsTest', { code: mainCode }),
				createNode('EventsTest', {
					code: absorbedCode,
					stringProperty: 'some string',
				}),
			]);

			const { status } = await absorbHandler()({
				code: mainCode,
				type: 'EventsTest',
				codeToAbsorb: absorbedCode,
			});

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectUpdateEvent('EventsTest', mainCode, ['stringProperty']);
			expectDeleteEvent('EventsTest', absorbedCode);
		});

		it('should send no update event if no real changes absorbed', async () => {
			await Promise.all([
				createNode('EventsTest', {
					code: mainCode,
					stringProperty: 'some string',
				}),
				createNode('EventsTest', {
					code: absorbedCode,
					stringProperty: 'some string',
				}),
			]);

			const { status } = await absorbHandler()({
				code: mainCode,
				type: 'EventsTest',
				codeToAbsorb: absorbedCode,
			});

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);

			expectDeleteEvent('EventsTest', absorbedCode);
		});
		it('should send extra update events when relationships are absorbed', async () => {
			const [, absorbed, leaf] = await Promise.all([
				createNode('EventsTest', { code: mainCode }),
				createNode('EventsTest', { code: absorbedCode }),
				createNode('EventsTestLeaf', { code: leafCode }),
			]);

			await connectNodes(absorbed, 'GENERIC_RELATIONSHIP', leaf);

			const { status } = await absorbHandler()({
				code: mainCode,
				type: 'EventsTest',
				codeToAbsorb: absorbedCode,
			});

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(3);
			expectDeleteEvent('EventsTest', absorbedCode);
			expectUpdateEvent('EventsTest', mainCode, [
				'deprecatedRelationshipProperty',
				'relationshipProperty',
			]);
			expectUpdateEvent('EventsTestLeaf', leafCode, [
				'deprecatedEventEmitters',
				'eventEmitters',
			]);
		});

		it('should send extra update events for peers who lose relationships', async () => {
			const [main, absorbed, leaf] = await Promise.all([
				createNode('EventsTest', { code: mainCode }),
				createNode('EventsTest', { code: absorbedCode }),
				createNode('EventsTestLeaf', { code: leafCode }),
			]);

			await connectNodes(main, 'GENERIC_RELATIONSHIP', leaf);
			await connectNodes(absorbed, 'GENERIC_RELATIONSHIP', leaf);

			const { status } = await absorbHandler()({
				code: mainCode,
				type: 'EventsTest',
				codeToAbsorb: absorbedCode,
			});

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectDeleteEvent('EventsTest', absorbedCode);
			expectUpdateEvent('EventsTestLeaf', leafCode, [
				'deprecatedEventEmitters',
				'eventEmitters',
			]);
		});

		it('should send no main update events when identical relationship is absorbed', async () => {
			const [main, absorbed, leaf] = await Promise.all([
				createNode('EventsTest', { code: mainCode }),
				createNode('EventsTest', { code: absorbedCode }),
				createNode('EventsTestLeaf', { code: leafCode }),
			]);

			await connectNodes(main, 'GENERIC_RELATIONSHIP', leaf);
			await connectNodes(absorbed, 'GENERIC_RELATIONSHIP', leaf);

			const { status } = await absorbHandler()({
				code: mainCode,
				type: 'EventsTest',
				codeToAbsorb: absorbedCode,
			});

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectDeleteEvent('EventsTest', absorbedCode);
			expectUpdateEvent('EventsTestLeaf', leafCode, [
				'deprecatedEventEmitters',
				'eventEmitters',
			]);
		});
		it('should send update events when reflective relationships are absorbed', async () => {
			const [main, absorbed] = await Promise.all([
				createNode('EventsTest', { code: mainCode }),
				createNode('EventsTest', { code: absorbedCode }),
			]);

			await connectNodes(main, 'NEXT_EVENT', absorbed);

			const { status } = await absorbHandler()({
				code: mainCode,
				type: 'EventsTest',
				codeToAbsorb: absorbedCode,
			});

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectDeleteEvent('EventsTest', absorbedCode);
			expectUpdateEvent('EventsTest', mainCode, ['previousEvent']);
		});
		it('should send no extra update events when N-to-1 relationships are absorbed', async () => {
			const [main, absorbed, leaf, leaf2] = await Promise.all([
				createNode('EventsTest', { code: mainCode }),
				createNode('EventsTest', { code: absorbedCode }),
				createNode('EventsTestLeaf', { code: leafCode }),
				createNode('EventsTestLeaf', { code: leafCode + 2 }),
			]);

			await connectNodes(main, 'HAS_UNIQUE_LEAF', leaf);
			await connectNodes(absorbed, 'HAS_UNIQUE_LEAF', leaf2);

			const { status } = await absorbHandler()({
				code: mainCode,
				type: 'EventsTest',
				codeToAbsorb: absorbedCode,
			});

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectDeleteEvent('EventsTest', absorbedCode);
			expectUpdateEvent('EventsTestLeaf', leafCode + 2, ['uniqueEvent']);
		});
	});
});

const AWS = require('aws-sdk');
const { docstore } = require('@financial-times/tc-api-s3-document-store');
const events = require('..');

const emitSpy = jest.fn();
events.emitter.emit = emitSpy;

const { setupMocks } = require('../../../../../test-helpers');
const {
	postHandler,
	patchHandler,
	// absorbHandler,
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
// const expectDeleteEvent = eventTester('DELETE');

const s3Client = new AWS.S3({
	accessKeyId: process.env.AWS_ACCESS_KEY,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

module.exports = { s3Client };

describe('docstore events', () => {
	const namespace = 'api-rest-handlers-broadcast';
	const mainCode = `${namespace}-main`;
	const mainType = 'MainType';
	// const absorbedCode = `${namespace}-absorbed`;

	const getInput = (body, query = {}) => ({
		type: mainType,
		code: mainCode,
		body,
		query,
		metadata: { requestId: `${namespace}-request-id` },
	});

	const { createNode } = setupMocks(namespace);
	const createMainNode = (props = {}) =>
		createNode('MainType', { code: mainCode, ...props });

	const documentStore = docstore(s3Client);

	beforeEach(() => {
		['upload', 'deleteObject', 'getObject'].forEach(method =>
			jest.spyOn(s3Client, method),
		);
	});

	afterEach(() => {
		events.emitter.emit.mockClear();
		jest.resetAllMocks();
	});

	describe('POST', () => {
		it('should include created document props in a CREATE event', async () => {
			s3Client.upload.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"someDocument": "some document"}',
					}),
			}));
			const { status } = await postHandler({
				documentStore,
			})(
				getInput({
					someDocument: 'some document',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectCreateEvent(mainType, mainCode, ['code', 'someDocument']);
		});
	});

	describe('PATCH', () => {
		it("should include created document props in a CREATE event if record doesn't exist", async () => {
			s3Client.upload.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"someDocument": "some document"}',
					}),
			}));
			const { status } = await patchHandler({
				documentStore,
			})(
				getInput({
					someDocument: 'some document',
				}),
			);

			expect(status).toBe(201);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectCreateEvent(mainType, mainCode, ['code', 'someDocument']);
		});
		it('should include created document props in an UPDATE event if record does exist but has no document', async () => {
			await createMainNode();
			s3Client.getObject.mockImplementation(() => ({
				promise: () => Promise.reject({ code: 'NoSuchKey' }), // eslint-disable-line prefer-promise-reject-errors
			}));
			s3Client.upload.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"someDocument": "some document"}',
					}),
			}));
			const { status } = await patchHandler({
				documentStore,
			})(
				getInput({
					someDocument: 'some document',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectUpdateEvent(mainType, mainCode, ['someDocument']);
		});

		it('should include created document props in an UPDATE event if record does exist and already has some document properties', async () => {
			await createMainNode();
			s3Client.getObject.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"anotherDocument": "another document"}',
					}),
			}));
			s3Client.upload.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body:
							'{"someDocument": "some document", "anotherDocument": "another document"}',
					}),
			}));
			const { status } = await patchHandler({
				documentStore,
			})(
				getInput({
					someDocument: 'some document',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectUpdateEvent(mainType, mainCode, ['someDocument']);
		});

		it('should not include document props in an UPDATE event if record does exist and already has the same document properties', async () => {
			await createMainNode();
			s3Client.getObject.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"someDocument": "some document"}',
					}),
			}));
			s3Client.upload.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"someDocument": "some document"}',
					}),
			}));
			const { status } = await patchHandler({
				documentStore,
			})(
				getInput({
					someDocument: 'some document',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectUpdateEvent(mainType, mainCode, ['someString']);
		});

		it('should include document props in an UPDATE event if record does exist and already has the same document properties', async () => {
			await createMainNode();
			s3Client.getObject.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"someDocument": "some document"}',
					}),
			}));
			s3Client.upload.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"someDocument": "some document2"}',
					}),
			}));
			const { status } = await patchHandler({
				documentStore,
			})(
				getInput({
					someDocument: 'some document',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectUpdateEvent(mainType, mainCode, [
				'someDocument',
				'someString',
			]);
		});
	});

	// 	it('should send extra UPDATE events when connecting to related nodes', async () => {
	// 		await createNode(mainType, mainCode);
	// 		await createNode(childType, childCode);
	// 		const { status } = await patchHandler()(
	// 			getInput(
	// 				{
	// 					someString: 'some string',
	// 					children: [childCode],
	// 				},
	// 				{ relationshipAction: 'replace' },
	// 			),
	// 		);

	// 		expect(status).toBe(200);
	// 		expect(emitSpy).toHaveBeenCalledTimes(2);
	// 		expectUpdateEvent(mainType, mainCode, ['children']);
	// 		expectUpdateEvent(childType, childCode, ['isChildOf']);
	// 	});

	// 	it('should send extra CREATE events when upserting to related nodes', async () => {
	// 		await createMainNode();
	// 		const { status } = await patchHandler()(
	// 			getInput(
	// 				{
	// 					someString: 'some string',
	// 					children: [childCode],
	// 				},
	// 				{ upsert: true, relationshipAction: 'replace' },
	// 			),
	// 		);

	// 		expect(status).toBe(200);
	// 		expect(emitSpy).toHaveBeenCalledTimes(2);
	// 		expectUpdateEvent(mainType, mainCode, ['children']);
	// 		expectCreateEvent(childType, childCode, ['code', 'isChildOf']);
	// 	});
	// 	it('should send extra UPDATE events when disconnecting from related nodes', async () => {
	// 		const [main, child] = await Promise.all([
	// 			createMainNode(),
	// 			createNode(childType, { code: childCode }),
	// 		]);
	// 		await connectNodes(main, 'HAS_CHILD', child);

	// 		const { status } = await patchHandler()(
	// 			getInput(
	// 				{
	// 					someString: 'some string',
	// 					'!children': [childCode],
	// 				},
	// 				{ relationshipAction: 'replace' },
	// 			),
	// 		);

	// 		expect(status).toBe(200);
	// 		expect(emitSpy).toHaveBeenCalledTimes(2);
	// 		expectUpdateEvent(mainType, mainCode, ['children']);
	// 		expectUpdateEvent(childType, childCode, ['isChildOf']);
	// 	});
	// });

	// describe('ABSORB', () => {
	// 	it('should send DELETE and UPDATE events for main nodes', async () => {
	// 		await Promise.all([
	// 			createMainNode(),
	// 			createNode(mainType, {
	// 				code: absorbedCode,
	// 				someString: 'some string',
	// 			}),
	// 		]);

	// 		const { status } = await absorbHandler()({
	// 			code: mainCode,
	// 			type: mainType,
	// 			codeToAbsorb: absorbedCode,
	// 		});

	// 		expect(status).toBe(200);
	// 		expect(emitSpy).toHaveBeenCalledTimes(2);
	// 		expectUpdateEvent(mainType, mainCode, ['someString']);
	// 		expectDeleteEvent(mainType, absorbedCode);
	// 	});

	// 	it('should send no update event if no real changes absorbed', async () => {
	// 		await Promise.all([
	// 			createNode(mainType, {
	// 				code: mainCode,
	// 				someString: 'some string',
	// 			}),
	// 			createNode(mainType, {
	// 				code: absorbedCode,
	// 				someString: 'some string',
	// 			}),
	// 		]);

	// 		const { status } = await absorbHandler()({
	// 			code: mainCode,
	// 			type: mainType,
	// 			codeToAbsorb: absorbedCode,
	// 		});

	// 		expect(status).toBe(200);
	// 		expect(emitSpy).toHaveBeenCalledTimes(1);

	// 		expectDeleteEvent(mainType, absorbedCode);
	// 	});
	// 	it('should send extra update events when relationships are absorbed', async () => {
	// 		const [, absorbed, child] = await Promise.all([
	// 			createMainNode(),
	// 			createNode(mainType, { code: absorbedCode }),
	// 			createNode(childType, { code: childCode }),
	// 		]);

	// 		await connectNodes(absorbed, 'HAS_CHILD', child);

	// 		const { status } = await absorbHandler()({
	// 			code: mainCode,
	// 			type: mainType,
	// 			codeToAbsorb: absorbedCode,
	// 		});

	// 		expect(status).toBe(200);
	// 		expect(emitSpy).toHaveBeenCalledTimes(3);
	// 		expectDeleteEvent(mainType, absorbedCode);
	// 		expectUpdateEvent(mainType, mainCode, ['children']);
	// 		expectUpdateEvent(childType, childCode, ['isChildOf']);
	// 	});
	// 	it.skip('should send no main update events when identical relationship is absorbed', async () => {
	// 		// Sends too many events. BUG - but not critical
	// 		const [main, absorbed, child] = await Promise.all([
	// 			createMainNode(),
	// 			createNode(mainType, { code: absorbedCode }),
	// 			createNode(childType, { code: childCode }),
	// 		]);

	// 		await connectNodes(main, 'HAS_CHILD', child);
	// 		await connectNodes(absorbed, 'HAS_CHILD', child);

	// 		const { status } = await absorbHandler()({
	// 			code: mainCode,
	// 			type: mainType,
	// 			codeToAbsorb: absorbedCode,
	// 		});

	// 		expect(status).toBe(200);
	// 		expect(emitSpy).toHaveBeenCalledTimes(2);
	// 		expectDeleteEvent(mainType, absorbedCode);
	// 		expectUpdateEvent(childType, childCode, ['isChildOf']);
	// 	});
	// 	it.skip('should send update events when reflective relationships are absorbed', async () => {
	// 		// Sends too many events. BUG - but not critical
	// 		const [main, absorbed] = await Promise.all([
	// 			createMainNode(),
	// 			createNode(mainType, { code: absorbedCode }),
	// 		]);

	// 		await connectNodes(main, 'HAS_YOUNGER_SIBLING', absorbed);

	// 		const { status } = await absorbHandler()({
	// 			code: mainCode,
	// 			type: mainType,
	// 			codeToAbsorb: absorbedCode,
	// 		});

	// 		expect(status).toBe(200);
	// 		expect(emitSpy).toHaveBeenCalledTimes(2);
	// 		expectDeleteEvent(mainType, absorbedCode);
	// 		expectUpdateEvent(mainType, mainCode, [
	// 			'olderSiblings',
	// 			'youngerSiblings',
	// 		]);
	// 	});
	// 	it.skip('should send no extra update events when N-to-1 relationships are absorbed', async () => {
	// 		// Sends too many events. BUG - but not critical
	// 		const [main, absorbed, child, child2] = await Promise.all([
	// 			createMainNode(),
	// 			createNode(mainType, { code: absorbedCode }),
	// 			createNode(childType, { code: childCode }),
	// 			createNode(childType, { code: childCode + 2 }),
	// 		]);

	// 		await connectNodes(main, 'HAS_FAVOURITE_CHILD', child);
	// 		await connectNodes(absorbed, 'HAS_FAVOURITE_CHILD', child2);

	// 		const { status } = await absorbHandler()({
	// 			code: mainCode,
	// 			type: mainType,
	// 			codeToAbsorb: absorbedCode,
	// 		});

	// 		expect(status).toBe(200);
	// 		expect(emitSpy).toHaveBeenCalledTimes(2);
	// 		expectDeleteEvent(mainType, absorbedCode);
	// 		expectUpdateEvent(childType, childCode, ['isFavouriteChildOf']);
	// 	});
	// });
});

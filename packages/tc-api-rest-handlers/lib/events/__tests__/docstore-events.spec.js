const AWS = require('aws-sdk');
const { docstore } = require('@financial-times/tc-api-s3-document-store');
const events = require('..');

const emitSpy = jest.fn();
events.emitter.emit = emitSpy;

const { setupMocks } = require('../../../../../test-helpers');
const { postHandler, patchHandler, absorbHandler } = require('../../..');

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

const s3Client = new AWS.S3({
	accessKeyId: process.env.AWS_ACCESS_KEY,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

describe('docstore events', () => {
	const namespace = 'api-rest-handlers-broadcast';
	const mainCode = `${namespace}-main`;
	const absorbedCode = `${namespace}-absorbed`;

	const getInput = (body, query = {}) => ({
		type: 'EventsTest',
		code: mainCode,
		body,
		query,
		metadata: { requestId: `${namespace}-request-id` },
	});

	const { createNode } = setupMocks(namespace);

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
						Body: '{"firstDocumentProperty": "some document"}',
					}),
			}));
			const { status } = await postHandler({
				documentStore,
			})(
				getInput({
					firstDocumentProperty: 'some document',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectCreateEvent('EventsTest', mainCode, [
				'code',
				'firstDocumentProperty',
			]);
		});
		it('should include created document props alongside normal ones in a CREATE event', async () => {
			s3Client.upload.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"firstDocumentProperty": "some document"}',
					}),
			}));
			const { status } = await postHandler({
				documentStore,
			})(
				getInput({
					firstDocumentProperty: 'some document',
					stringProperty: 'some string',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectCreateEvent('EventsTest', mainCode, [
				'code',
				'firstDocumentProperty',
				'stringProperty',
			]);
		});
	});

	describe('PATCH', () => {
		it("should include created document props in a CREATE event if record doesn't exist", async () => {
			s3Client.upload.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"firstDocumentProperty": "some document"}',
					}),
			}));
			const { status } = await patchHandler({
				documentStore,
			})(
				getInput({
					firstDocumentProperty: 'some document',
				}),
			);

			expect(status).toBe(201);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectCreateEvent('EventsTest', mainCode, [
				'code',
				'firstDocumentProperty',
			]);
		});
		it('should include created document props in an UPDATE event if record does exist but has no document', async () => {
			await createNode('EventsTest', { code: mainCode });
			s3Client.getObject.mockImplementation(() => ({
				promise: () => Promise.reject({ code: 'NoSuchKey' }), // eslint-disable-line prefer-promise-reject-errors
			}));
			s3Client.upload.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"firstDocumentProperty": "some document"}',
					}),
			}));
			const { status } = await patchHandler({
				documentStore,
			})(
				getInput({
					firstDocumentProperty: 'some document',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectUpdateEvent('EventsTest', mainCode, [
				'firstDocumentProperty',
			]);
		});

		it('should include created document props alongisde normal ones in an UPDATE event if record does exist but has no document', async () => {
			await createNode('EventsTest', { code: mainCode });
			s3Client.getObject.mockImplementation(() => ({
				promise: () => Promise.reject({ code: 'NoSuchKey' }), // eslint-disable-line prefer-promise-reject-errors
			}));
			s3Client.upload.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"firstDocumentProperty": "some document"}',
					}),
			}));
			const { status } = await patchHandler({
				documentStore,
			})(
				getInput({
					firstDocumentProperty: 'some document',
					stringProperty: 'some string',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectUpdateEvent('EventsTest', mainCode, [
				'firstDocumentProperty',
				'stringProperty',
			]);
		});

		it('should include created document props in an UPDATE event if record does exist and already has some document properties', async () => {
			await createNode('EventsTest', { code: mainCode });
			s3Client.getObject.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"secondDocumentProperty": "another document"}',
					}),
			}));
			s3Client.upload.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"firstDocumentProperty": "some document", "secondDocumentProperty": "another document"}',
					}),
			}));
			const { status } = await patchHandler({
				documentStore,
			})(
				getInput({
					firstDocumentProperty: 'some document',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectUpdateEvent('EventsTest', mainCode, [
				'firstDocumentProperty',
			]);
		});

		it('should not include document props in an UPDATE event if record does exist and already has the same document properties', async () => {
			await createNode('EventsTest', { code: mainCode });
			s3Client.getObject.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"firstDocumentProperty": "some document"}',
					}),
			}));
			s3Client.upload.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"firstDocumentProperty": "some document"}',
					}),
			}));
			const { status } = await patchHandler({
				documentStore,
			})(
				getInput({
					firstDocumentProperty: 'some document',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).not.toHaveBeenCalled();
		});

		it('should include document props in an UPDATE event if record does exist and already has the same document properties', async () => {
			await createNode('EventsTest', { code: mainCode });
			s3Client.getObject.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"firstDocumentProperty": "some document"}',
					}),
			}));
			s3Client.upload.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"firstDocumentProperty": "some document2"}',
					}),
			}));
			const { status } = await patchHandler({
				documentStore,
			})(
				getInput({
					firstDocumentProperty: 'some document2',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectUpdateEvent('EventsTest', mainCode, [
				'firstDocumentProperty',
			]);
		});
	});

	describe('ABSORB', () => {
		it('should include details of changed document props when absorbed', async () => {
			await Promise.all([
				createNode('EventsTest', { code: mainCode }),
				createNode('EventsTest', {
					code: absorbedCode,
					stringProperty: 'some string',
				}),
			]);
			s3Client.deleteObject.mockImplementation(() => ({
				promise: () => Promise.resolve({ VersionId: 'lalala' }),
			}));
			s3Client.getObject.mockImplementation(({ Key }) => ({
				promise: () =>
					Promise.resolve({
						Body: /absorbed/.test(Key)
							? '{"secondDocumentProperty": "another document"}'
							: '{"firstDocumentProperty": "some document"}',
					}),
			}));
			s3Client.upload.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						VersionId: 'lalalala',
						Body: '{"firstDocumentProperty": "some document", "secondDocumentProperty": "another document"}',
					}),
			}));

			const { status } = await absorbHandler({ documentStore })({
				code: mainCode,
				type: 'EventsTest',
				codeToAbsorb: absorbedCode,
			});

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectUpdateEvent('EventsTest', mainCode, [
				'secondDocumentProperty',
				'stringProperty',
			]);
			expectDeleteEvent('EventsTest', absorbedCode);
		});

		it('should not include details of unchanged document props when absorbed', async () => {
			await Promise.all([
				createNode('EventsTest', { code: mainCode }),
				createNode('EventsTest', {
					code: absorbedCode,
					stringProperty: 'some string',
				}),
			]);
			s3Client.deleteObject.mockImplementation(() => ({
				promise: () => Promise.resolve({ VersionId: 'lalala' }),
			}));
			s3Client.getObject.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"firstDocumentProperty": "some document"}',
					}),
			}));
			s3Client.upload.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						VersionId: 'lalalala',
						Body: '{"firstDocumentProperty": "some document"}',
					}),
			}));

			const { status } = await absorbHandler({ documentStore })({
				code: mainCode,
				type: 'EventsTest',
				codeToAbsorb: absorbedCode,
			});

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectUpdateEvent('EventsTest', mainCode, ['stringProperty']);
			expectDeleteEvent('EventsTest', absorbedCode);
		});
	});
});

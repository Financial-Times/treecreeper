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

module.exports = { s3Client };

describe('docstore events', () => {
	const namespace = 'api-rest-handlers-broadcast';
	const mainCode = `${namespace}-main`;
	const mainType = 'MainType';
	const absorbedCode = `${namespace}-absorbed`;

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
		it('should include created document props alongside normal ones in a CREATE event', async () => {
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
					someString: 'some string',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectCreateEvent(mainType, mainCode, [
				'code',
				'someDocument',
				'someString',
			]);
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

		it('should include created document props alongisde normal ones in an UPDATE event if record does exist but has no document', async () => {
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
					someString: 'some string',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectUpdateEvent(mainType, mainCode, [
				'someDocument',
				'someString',
			]);
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
			expect(emitSpy).not.toHaveBeenCalled();
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
					someDocument: 'some document2',
				}),
			);

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expectUpdateEvent(mainType, mainCode, ['someDocument']);
		});
	});

	describe('ABSORB', () => {
		it('should include details of changed document props when absorbed', async () => {
			await Promise.all([
				createMainNode(),
				createNode(mainType, {
					code: absorbedCode,
					someString: 'some string',
				}),
			]);
			s3Client.deleteObject.mockImplementation(() => ({
				promise: () => Promise.resolve({ VersionId: 'lalala' }),
			}));
			s3Client.getObject.mockImplementation(({ Key }) => ({
				promise: () =>
					Promise.resolve({
						Body: /absorbed/.test(Key)
							? '{"anotherDocument": "another document"}'
							: '{"someDocument": "some document"}',
					}),
			}));
			s3Client.upload.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						VersionId: 'lalalala',
						Body:
							'{"someDocument": "some document", "anotherDocument": "another document"}',
					}),
			}));

			const { status } = await absorbHandler({ documentStore })({
				code: mainCode,
				type: mainType,
				codeToAbsorb: absorbedCode,
			});

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectUpdateEvent(mainType, mainCode, [
				'anotherDocument',
				'someString',
			]);
			expectDeleteEvent(mainType, absorbedCode);
		});

		it('should not include details of unchanged document props when absorbed', async () => {
			await Promise.all([
				createMainNode(),
				createNode(mainType, {
					code: absorbedCode,
					someString: 'some string',
				}),
			]);
			s3Client.deleteObject.mockImplementation(() => ({
				promise: () => Promise.resolve({ VersionId: 'lalala' }),
			}));
			s3Client.getObject.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						Body: '{"someDocument": "some document"}',
					}),
			}));
			s3Client.upload.mockImplementation(() => ({
				promise: () =>
					Promise.resolve({
						VersionId: 'lalalala',
						Body: '{"someDocument": "some document"}',
					}),
			}));

			const { status } = await absorbHandler({ documentStore })({
				code: mainCode,
				type: mainType,
				codeToAbsorb: absorbedCode,
			});

			expect(status).toBe(200);
			expect(emitSpy).toHaveBeenCalledTimes(2);
			expectUpdateEvent(mainType, mainCode, ['someString']);
			expectDeleteEvent(mainType, absorbedCode);
		});
	});
});

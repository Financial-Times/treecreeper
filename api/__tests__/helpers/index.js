const sinon = require('sinon');
const logger = require('@financial-times/n-logger').default;
const lolex = require('lolex');
const EventLogWriter = require('../../server/lib/event-log-writer');
const salesForceSync = require('../../server/lib/salesforce-sync');
const { getNamespacedSupertest } = require('./supertest');
const dbConnection = require('./db-connection');
const S3DocumentsHelper = require('../../server/routes/rest/lib/s3-documents-helper');

const { schemaReady } = require('../../server/lib/init-schema');

const stubKinesis = () => {
	jest.spyOn(EventLogWriter.prototype, 'sendEvent').mockImplementation(
		data => {
			logger.debug('Event log stub sendEvent called', {
				event: data.event,
			});
			return Promise.resolve();
		},
	);

	return EventLogWriter.prototype.sendEvent;
};

const stubS3Get = responses => {
	jest.spyOn(S3DocumentsHelper.prototype, 'getFileFromS3').mockImplementation(
		data => {
			logger.debug('S3DocumentsHelper stub getFileFromS3 called', {
				event: data.event,
			});
			return Promise.resolve(
				responses.get ||
					{
						// troubleshooting: 'Fake Document',
					},
			);
		},
	);
	return S3DocumentsHelper.prototype.getFileFromS3;
};

const stubS3Delete = responses => {
	jest.spyOn(
		S3DocumentsHelper.prototype,
		'deleteFileFromS3',
	).mockImplementation(data => {
		logger.debug('S3DocumentsHelper stub deleteFileFromS3 called', {
			event: data.event,
		});
		return Promise.resolve(responses.delete || 'FakeDeleteMarker');
	});
	return S3DocumentsHelper.prototype.deleteFileFromS3;
};

const stubS3Patch = responses => {
	jest.spyOn(S3DocumentsHelper.prototype, 'patchS3file').mockImplementation(
		data => {
			logger.debug('S3DocumentsHelper stub patchS3file called', {
				event: data.event,
			});
			return Promise.resolve(
				responses.patch || {
					versionId: 'FakePatchVersionId',
					newBodyDocs: {
						someDocument: 'Another Fake Document',
					},
				},
			);
		},
	);
	return S3DocumentsHelper.prototype.patchS3file;
};

const stubS3Upload = responses => {
	jest.spyOn(S3DocumentsHelper.prototype, 'uploadToS3').mockImplementation(
		data => {
			logger.debug('S3DocumentsHelper stub uploadToS3 called', {
				event: data.event,
			});
			return Promise.resolve(responses.upload || 'FakeVersionId');
		},
	);
	return S3DocumentsHelper.prototype.uploadToS3;
};

const stubS3Merge = responses => {
	jest.spyOn(
		S3DocumentsHelper.prototype,
		'mergeFilesInS3',
	).mockImplementation(data => {
		logger.debug('S3DocumentsHelper stub mergeFilesInS3 called', {
			event: data.event,
		});
		return Promise.resolve({
			deleteVersionId: 'FakeDeleteVersionId',
			writeVersionId: 'FakeWriteVersionId',
			updatedBody: responses.merge || {
				someDocument: 'Fake Document',
				anotherDocument: 'A Third Fake Document',
			},
		});
	});
	return S3DocumentsHelper.prototype.mergeFilesInS3;
};

const { testDataCreators, dropDb, testDataCheckers } = require('./test-data');

const setupMocks = (
	sandbox,
	{ withDb = true, namespace } = {},
	includeClientId,
) => {
	const request = getNamespacedSupertest(namespace, includeClientId);
	let clock;
	const now = '2019-01-09T09:08:22.908Z';
	const then = '2015-11-15T08:12:27.908Z';
	if (withDb) {
		// clean up after potentially failed test runs
		beforeAll(() => dropDb(namespace));
	}

	beforeEach(async () => {
		// have to await in here as supertest doesn't wait for the callback
		// in app listen to be called, so doesn't await schemaReady where
		// app.listen does in server/create-app.js
		await schemaReady;
		sandbox.sinon = sinon.createSandbox();
		const s3Responses = {};
		jest.spyOn(salesForceSync, 'setSalesforceIdForSystem');
		sandbox.request = request;
		sandbox.stubSendEvent = stubKinesis();
		sandbox.stubS3Get = stubS3Get(s3Responses);
		sandbox.stubPatchS3file = stubS3Patch(s3Responses);
		sandbox.stubDeleteFileFromS3 = stubS3Delete(s3Responses);
		sandbox.stubS3Upload = stubS3Upload(s3Responses);
		sandbox.stubS3Merge = stubS3Merge(s3Responses);

		sandbox.setS3Responses = overrides =>
			Object.assign(s3Responses, overrides);
		clock = lolex.install({ now: new Date(now).getTime() });
		if (withDb) {
			testDataCreators(namespace, sandbox, now, then);
		}

		sandbox.expectKinesisEvents = (...events) => {
			expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(events.length);
			events.forEach(
				([action, code, type, updatedProperties, clientId]) => {
					expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
						action,
						type,
						code,
						requestId: `${namespace}-request`,
						clientId: clientId || `${namespace}-client`,
						clientUserId: `${namespace}-user`,
						updatedProperties:
							updatedProperties && updatedProperties.sort(),
					});
				},
			);
		};

		sandbox.expectS3Actions = (...actions) => {
			actions.forEach(action => {
				switch (action.action) {
					case 'upload':
						expect(sandbox.stubS3Upload).toHaveBeenCalledWith(
							action.params,
							action.requestType,
						);
						break;
					case 'patch':
						expect(sandbox.stubPatchS3file).toHaveBeenCalledWith(
							action.nodeType,
							action.code,
							action.body,
						);
						break;
					case 'delete':
						if (action.versionId) {
							expect(
								sandbox.stubDeleteFileFromS3,
							).toHaveBeenCalledWith(
								action.nodeType,
								action.code,
								action.versionId,
							);
						} else {
							expect(
								sandbox.stubDeleteFileFromS3,
							).toHaveBeenCalledWith(
								action.nodeType,
								action.code,
							);
						}
						break;
					case 'get':
						expect(sandbox.stubS3Get).toHaveBeenCalledWith(
							action.nodeType,
							action.code,
						);
						break;
					case 'merge':
						expect(sandbox.stubS3Merge).toHaveBeenCalledWith(
							action.nodeType,
							action.sourceCode,
							action.destinationCode,
						);
						break;
					default:
				}
			});
		};

		sandbox.expectNoS3Actions = (...actions) =>
			actions.forEach(action => {
				switch (action) {
					case 'upload':
						expect(sandbox.stubS3Upload).toHaveBeenCalledTimes(0);
						break;
					case 'patch':
						expect(sandbox.stubPatchS3file).toHaveBeenCalledTimes(
							0,
						);
						break;
					case 'delete':
						expect(
							sandbox.stubDeleteFileFromS3,
						).toHaveBeenCalledTimes(0);
						break;
					case 'get':
						expect(sandbox.stubS3).toHaveBeenCalledTimes(0);
						break;
					default:
				}
			});

		sandbox.expectNoKinesisEvents = () =>
			expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(0);
	});
	afterEach(async () => {
		sandbox.sinon.restore();
		jest.restoreAllMocks();
		clock = clock.uninstall();
		if (withDb) {
			await dropDb(namespace);
		}
	});
};

const stubS3Unavailable = sandbox => {
	Object.getOwnPropertyNames(S3DocumentsHelper.prototype).forEach(method => {
		sandbox.sinon.stub(S3DocumentsHelper.prototype, method).throws();
	});
};

module.exports = Object.assign(
	{
		stubKinesis,
		setupMocks,
		stubS3Unavailable,
	},
	dbConnection,
	testDataCheckers,
);

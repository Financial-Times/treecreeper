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

const stubS3Delete = () => {
	jest.spyOn(
		S3DocumentsHelper.prototype,
		'deleteFileFromS3',
	).mockImplementation(data => {
		logger.debug('S3DocumentsHelper stub deleteFileFromS3 called', {
			event: data.event,
		});
		return Promise.resolve();
	});
	return S3DocumentsHelper.prototype.deleteFileFromS3;
};

const stubS3Patch = () => {
	jest.spyOn(S3DocumentsHelper.prototype, 'patchS3file').mockImplementation(
		data => {
			logger.debug('S3DocumentsHelper stub patchS3file called', {
				event: data.event,
			});
			return Promise.resolve();
		},
	);
	return S3DocumentsHelper.prototype.patchS3file;
};

const stubS3Upload = () => {
	jest.spyOn(S3DocumentsHelper.prototype, 'uploadToS3').mockImplementation(
		data => {
			logger.debug('S3DocumentsHelper stub uploadToS3 called', {
				event: data.event,
			});
			return Promise.resolve();
		},
	);
	return S3DocumentsHelper.prototype.uploadToS3;
};

const stubS3Restore = () => {
	jest.spyOn(
		S3DocumentsHelper.prototype,
		'restoreToPreviousVersion',
	).mockImplementation(data => {
		logger.debug('S3DocumentsHelper stub restoreToPreviousVersion called', {
			event: data.event,
		});
		return Promise.resolve();
	});
	return S3DocumentsHelper.prototype.uploadToS3;
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
		jest.spyOn(salesForceSync, 'setSalesforceIdForSystem');
		sandbox.request = request;
		sandbox.stubSendEvent = stubKinesis(sandbox.sinon);
		sandbox.stubPatchS3file = stubS3Patch(sandbox.sinon);
		sandbox.stubDeleteFileFromS3 = stubS3Delete(sandbox.sinon);
		sandbox.stubS3Upload = stubS3Upload(sandbox.sinon);
		sandbox.stubS3Restore = stubS3Restore(sandbox.sinon);
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
						expect(
							sandbox.stubDeleteFileFromS3,
						).toHaveBeenCalledWith(action.nodeType, action.code);
						break;
					case 'restore':
						expect(sandbox.stubS3Restore).toHaveBeenCalledWith(
							action.nodeType,
							action.code,
						);
						break;
					default:
				}
			});
		};

		sandbox.expectNoS3Actions = () =>
			expect(sandbox.stubS3Upload).toHaveBeenCalledTimes(0);
		expect(sandbox.stubDeleteFileFromS3).toHaveBeenCalledTimes(0);

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

module.exports = Object.assign(
	{
		stubKinesis,
		setupMocks,
	},
	dbConnection,
	testDataCheckers,
);

const sinon = require('sinon');
const logger = require('@financial-times/n-logger').default;
const lolex = require('lolex');
const EventLogWriter = require('../../server/lib/event-log-writer');
const salesForceSync = require('../../server/lib/salesforce-sync');
const { getNamespacedSupertest } = require('./supertest');
const dbConnection = require('./db-connection');

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

const { testDataCreators, dropDb, testDataCheckers } = require('./test-data');

const setupMocks = (sandbox, { withDb = true, namespace } = {}) => {
	const request = getNamespacedSupertest(namespace);
	let clock;
	const now = '2019-01-09T09:08:22.908Z';
	const then = '2015-11-15T08:12:27.908Z';

	if (withDb) {
		// clean up after potentially failed test runs
		beforeAll(() => dropDb(namespace));
	}

	beforeEach(async () => {
		sandbox.sinon = sinon.createSandbox();
		jest.spyOn(salesForceSync, 'setSalesforceIdForSystem');
		sandbox.request = request;
		sandbox.stubSendEvent = stubKinesis(sandbox.sinon);
		clock = lolex.install({ now: new Date(now).getTime() });
		if (withDb) {
			testDataCreators(namespace, sandbox, now, then);
		}

		sandbox.expectEvents = (...events) => {
			expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(events.length);
			events.forEach(([action, code, type, updatedProperties]) => {
				expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
					action,
					type,
					code,
					requestId: `${namespace}-request`,
					clientId: `${namespace}-client`,
					clientUserId: `${namespace}-user`,
					updatedProperties:
						updatedProperties && updatedProperties.sort(),
				});
			});
		};

		sandbox.expectNoEvents = () =>
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

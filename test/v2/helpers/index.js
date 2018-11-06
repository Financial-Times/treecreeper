const sinon = require('sinon');
const logger = require('@financial-times/n-logger').default;
const lolex = require('lolex');
const EventLogWriter = require('../../../server/lib/event-log-writer');
const salesForceSync = require('../../../server/lib/salesforce-sync');
const { getNamespacedSupertest } = require('./supertest');
const dbConnection = require('./db-connection');

const stubKinesis = () => {
	jest.spyOn(EventLogWriter.prototype, 'sendEvent').mockImplementation(data => {
		logger.debug('Event log stub sendEvent called', { event: data.event });
		return Promise.resolve();
	});

	return EventLogWriter.prototype.sendEvent;
};

const { testDataCreators, dropDb, testDataCheckers } = require('./test-data');

const setupMocks = (sandbox, { withDb = true, namespace } = {}) => {
	const request = getNamespacedSupertest(namespace);
	let clock;
	const timestamp = 1528458548930;
	const formattedTimestamp = 'Fri, 08 Jun 2018 11:49:08 GMT';
	if (withDb) {
		// clean up after potentially failed test runs
		beforeAll(() => dropDb(namespace));
	}

	beforeEach(async () => {
		sandbox.sinon = sinon.createSandbox();
		sandbox.sinon.stub(salesForceSync, 'setSalesforceIdForSystem');
		sandbox.request = request;
		sandbox.stubSendEvent = stubKinesis(sandbox.sinon);
		clock = lolex.install({ now: timestamp });
		if (withDb) {
			testDataCreators(namespace, sandbox, formattedTimestamp);
		}
	});
	afterEach(async () => {
		sandbox.sinon.restore();
		EventLogWriter.prototype.sendEvent.mockRestore();
		clock = clock.uninstall();
		if (withDb) {
			await dropDb(namespace);
		}
	});
};

module.exports = Object.assign(
	{
		stubKinesis,
		setupMocks
	},
	dbConnection,
	testDataCheckers
);

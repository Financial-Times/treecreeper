const sinon = require('sinon');
const lolex = require('lolex');
const { getNamespacedSupertest } = require('./supertest');
const dbConnection = require('./db-connection');

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
		sandbox.sinon = sinon.createSandbox();
		sandbox.request = request;
		clock = lolex.install({ now: new Date(now).getTime() });
		if (withDb) {
			testDataCreators(namespace, sandbox, now, then);
		}
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

const stubS3Unavailable = () => {};

module.exports = {
	setupMocks,
	stubS3Unavailable,
	...dbConnection,
	...testDataCheckers,
};

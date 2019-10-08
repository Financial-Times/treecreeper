/* global jest beforeAll beforeEach afterEach */
const lolex = require('lolex'); // eslint-disable-line import/no-extraneous-dependencies
const dbConnection = require('./db-connection');
const { schemaReady } = require('../api/server/lib/init-schema');

const { neo4jTest } = require('./neo4j-test');
const { testDataCreators, dropDb, testDataCheckers } = require('./test-data');

const setupMocks = (sandbox, { namespace } = {}) => {
	let clock;
	const now = '2019-01-09T09:08:22.908Z';
	const then = '2015-11-15T08:12:27.908Z';
	// clean up after potentially failed test runs
	beforeAll(() => dropDb(namespace));

	beforeEach(async () => {
		// have to await in here as supertest doesn't wait for the callback
		// in app listen to be called, so doesn't await schemaReady where
		// app.listen does in server/create-app.js
		await schemaReady;
		clock = lolex.install({ now: new Date(now).getTime() });
		testDataCreators(namespace, sandbox, now, then);
	});
	afterEach(async () => {
		jest.restoreAllMocks();
		clock = clock.uninstall();
		await dropDb(namespace);
	});
};

module.exports = Object.assign(
	{
		setupMocks,
		neo4jTest,
	},
	dbConnection,
	testDataCheckers,
);

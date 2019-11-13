/* global jest beforeAll beforeEach afterEach afterAll */

/* eslint-disable import/no-extraneous-dependencies */
const lolex = require('lolex');
const schema = require('@financial-times/tc-schema-sdk');
/* eslint-enable import/no-extraneous-dependencies */

schema.init({ updateMode: 'poll' });
const schemaReady = schema.ready();

const dbConnection = require('./db-connection');

const { neo4jTest } = require('./neo4j-test');
const { fixtureBuilder, dropFixtures } = require('./test-fixtures');

const setupMocks = namespace => {
	let clock;
	const now = '2019-01-09T09:08:22.908Z';
	const then = '2015-11-15T08:12:27.908Z';

	beforeAll(async () => {
		// clean up after potentially failed test runs
		await dropFixtures(namespace);
		await schemaReady;
	});

	beforeEach(async () => {
		clock = lolex.install({ now: new Date(now).getTime() });
	});
	afterEach(async () => {
		jest.restoreAllMocks();
		clock = clock.uninstall();
		await dropFixtures(namespace);
	});
	afterAll(async () => {
		await dbConnection.driver.close();
	});
	return fixtureBuilder(namespace, now, then);
};

module.exports = {
	setupMocks,
	neo4jTest,
	...dbConnection,
};

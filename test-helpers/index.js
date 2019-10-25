/* global jest beforeAll beforeEach afterEach */
const lolex = require('lolex'); // eslint-disable-line import/no-extraneous-dependencies
const dbConnection = require('./db-connection');
const { schemaReady } = require('../api/server/lib/init-schema');

const { neo4jTest } = require('./neo4j-test');
const { fixtureBuilder, dropFixtures } = require('./test-fixtures');

const setupMocks = namespace => {
	let clock;
	const now = '2019-01-09T09:08:22.908Z';
	const then = '2015-11-15T08:12:27.908Z';

	beforeAll(async () => {
		// clean up after potentially failed test runs
		await dropFixtures(namespace)
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
	return fixtureBuilder(namespace, now, then);
};

module.exports = Object.assign(
	{
		setupMocks,
		neo4jTest,
	},
	dbConnection,
);

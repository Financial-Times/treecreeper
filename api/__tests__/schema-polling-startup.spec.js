const fetch = require('node-fetch');
const {
	getSchemaFilename,
} = require('../../packages/treecreeper-schema-file-name');

jest.useFakeTimers();

// these tests will always live in the api repo
describe('schema polling startup', () => {
	beforeAll(() => {
		fetch.config.fallbackToNetwork = false;
	});
	afterAll(() => {
		fetch.config.fallbackToNetwork = 'always';
	});

	it('waits for poller to fetch latest schema successfully, using env var & package.json for schema url', async () => {
		delete process.env.TREECREEPER_SCHEMA_DIRECTORY;
		process.env.TEST_STARTUP = true;
		process.env.TREECREEPER_SCHEMA_URL = 'http://example.com';
		fetch.mock('*', {});
		const listen = jest.fn();
		jest.doMock('../server/create-app', () => () => ({
			listen,
		}));
		require('../server/app');
		expect(listen).not.toHaveBeenCalled();
		await fetch.flush(true);
		expect(fetch.lastUrl()).toEqual(
			`http://example.com/${getSchemaFilename()}`,
		);
		expect(listen).toHaveBeenCalled();
		fetch.reset();
		jest.resetModules();
		jest.dontMock('../server/create-app');
	});
});

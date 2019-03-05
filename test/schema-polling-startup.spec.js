const fetch = require('node-fetch');
const { poller } = require('@financial-times/biz-ops-schema');

const { schemaFileName } = poller;

jest.useFakeTimers();

describe('schema polling startup', () => {
	beforeAll(() => {
		fetch.config.fallbackToNetwork = false;
	});
	afterAll(() => {
		fetch.config.fallbackToNetwork = 'always';
	});

	it('waits for poller to fetch latest schema successfully, using env var & package.json for schema url', async () => {
		process.env.TEST_STARTUP = true;
		fetch.mock('*', {});
		const listen = jest.fn();
		jest.doMock('../server/create-app', () => () => ({
			listen,
		}));
		require('../server/app');
		expect(listen).not.toHaveBeenCalled();
		await fetch.flush(true);
		expect(fetch.lastUrl()).toEqual(
			`${process.env.SCHEMA_BASE_URL}/${schemaFileName}`,
		);
		expect(listen).toHaveBeenCalled();
		fetch.reset();
		jest.resetModules();
		jest.dontMock('../server/create-app');
		delete process.env.TEST_STARTUP;
	});
});

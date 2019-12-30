const { getApp } = require('..');

jest.mock('node-fetch', () => require('fetch-mock-jest').sandbox());
const fetch = require('node-fetch');

describe('schema polling startup', () => {
	it('does not resolve promise for app until schema is hydrated when polling', async () => {
		delete process.env.TREECREEPER_SCHEMA_DIRECTORY;
		process.env.TEST_STARTUP = true;
		process.env.TREECREEPER_SCHEMA_URL = 'http://example.com';
		fetch.mock('*', {});
		let initialised = false;
		const promiseOfApp = getApp({ schemaOptions: { updateMode: 'poll' } });
		expect(initialised).toBe(false);
		promiseOfApp.then(() => {
			initialised = true;
		});
		await fetch.flush(true);
		expect(fetch.lastUrl()).toEqual(`http://example.com/schema.json`);
		await new Promise(res => setTimeout(res));
		expect(initialised).toBe(true);
		fetch.reset();
	});
});

const fetch = require('node-fetch');

jest.mock('../../package.json', () => ({ version: '8.9.10-beta.1' }), {
	virtual: true,
});

const { init } = require('../../lib/get-instance');

describe('fetching prerelease schemas', () => {
	afterEach(() => fetch.reset());
	it('fetches prerelease schemas when using stale update mode', async () => {
		const schema = init({
			ttl: 100,
			baseUrl: 'https://base.url',
			updateMode: 'stale',
		});
		fetch.mock('https://base.url/v8-prerelease.json', { result: true });
		schema.refresh();
		expect(fetch.called()).toBe(true);
	});

	it('fetches prerelease schemas when using poll update mode', async () => {
		const schema = init({
			ttl: 100,
			baseUrl: 'https://base.url',
			updateMode: 'poll',
		});
		fetch.mock('https://base.url/v8-prerelease.json', { result: true });
		schema.startPolling();
		expect(fetch.called()).toBe(true);
		schema.stopPolling();
	});
});

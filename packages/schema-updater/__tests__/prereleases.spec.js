const fetch = require('node-fetch');

jest.mock('../../../package.json', () => ({ version: '8.9.10-beta.1' }), {
	virtual: true,
});

const { SchemaUpdater } = require('..');

// TODO move into schema-utils
const { RawDataWrapper } = require('../../schema-sdk/raw-data-wrapper');
const { Cache } = require('../../schema-utils');

const create = options =>
	new SchemaUpdater(options, new RawDataWrapper(), new Cache());

describe('fetching prerelease schemas', () => {
	beforeAll(() => {
		fetch.config.fallbackToNetwork = false;
	});
	afterAll(() => {
		fetch.config.fallbackToNetwork = 'always';
	});
	afterEach(() => fetch.reset());
	it('fetches prerelease schemas when using stale update mode', async () => {
		const schema = create({
			ttl: 100,
			schemaBaseUrl: 'https://base.url',
			updateMode: 'stale',
		});
		fetch.mock('https://base.url/v8-prerelease.json', { result: true });
		schema.refresh();
		expect(fetch.called()).toBe(true);
	});

	it('fetches prerelease schemas when using poll update mode', async () => {
		const schema = create({
			ttl: 100,
			schemaBaseUrl: 'https://base.url',
			updateMode: 'poll',
		});
		fetch.mock('https://base.url/v8-prerelease.json', { result: true });
		schema.startPolling();
		expect(fetch.called()).toBe(true);
		schema.stopPolling();
	});
});

const fetch = require('node-fetch');

jest.useFakeTimers();

jest.mock('../../../../package.json', () => ({ version: '8.9.10' }), {
	virtual: true,
});

const { SchemaUpdater } = require('../updater');
// TODO move into schema-utils
const { RawDataWrapper } = require('../raw-data-wrapper');
const { Cache } = require('../../../schema-utils');

const create = options =>
	new SchemaUpdater(options, new RawDataWrapper(), new Cache());

const nextTick = () => new Promise(res => process.nextTick(res));

describe('refreshing schema when stale', () => {
	const schemaDir = process.env.TREECREEPER_SCHEMA_DIRECTORY;
	beforeAll(() => {
		delete process.env.TREECREEPER_SCHEMA_DIRECTORY;
		fetch.config.fallbackToNetwork = false;
	});
	afterAll(() => {
		process.env.TREECREEPER_SCHEMA_DIRECTORY = schemaDir;
		fetch.config.fallbackToNetwork = 'always';
	});
	afterEach(() => fetch.reset());
	it('does not fetch on init', async () => {
		create({
			ttl: 100,
			schemaBaseUrl: 'https://base.url',
			updateMode: 'poll',
		});
		fetch.mock('https://base.url/v8.json', { result: true });
		expect(fetch.called()).toBe(false);
	});
	it('fetches when startPolling method called', async () => {
		const schema = create({
			ttl: 100,
			schemaBaseUrl: 'https://base.url',
			updateMode: 'poll',
		});
		fetch.mock('https://base.url/v8.json', { result: true });
		let isPending = true;
		schema.startPolling().then(() => {
			isPending = false;
		});
		expect(fetch.called()).toBe(true);
		expect(isPending).toEqual(true);
		await fetch.flush();
		await nextTick();
		expect(isPending).toEqual(false);
		schema.stopPolling();
	});

	it('fetches again after TTL has expired', async () => {
		const schema = create({
			ttl: 100,
			schemaBaseUrl: 'https://base.url',
			updateMode: 'poll',
		});
		fetch.mock('https://base.url/v8.json', { result: true });
		schema.startPolling();
		await fetch.flush();
		fetch.resetHistory();
		jest.advanceTimersByTime(101);
		expect(fetch.called()).toBe(true);
		schema.stopPolling();
	});

	describe('handle updates', () => {
		it('noop if new version is same as old', async () => {
			const schema = create({
				ttl: 100,
				schemaBaseUrl: 'https://base.url',
				updateMode: 'poll',
			});
			schema.version = 'v8.9.10';
			const listener = jest.fn();
			schema.on('change', listener);
			fetch.mock('https://base.url/v8.json', { version: 'v8.9.10' });
			schema.startPolling();
			await fetch.flush();
			expect(listener).not.toHaveBeenCalled();
			schema.stopPolling();
		});

		it('updates local data nad triggers event when version has changed', async () => {
			const schema = create({
				ttl: 100,
				schemaBaseUrl: 'https://base.url',
				updateMode: 'poll',
			});
			const listener = jest.fn();
			schema.on('change', listener);
			const data = {
				version: 'v8.9.10',
				schema: {
					types: [
						{
							name: 'NotIt',
						},
					],
				},
			};
			fetch.mock('https://base.url/v8.json', data);
			schema.startPolling();
			await fetch.flush();
			expect(listener).toHaveBeenCalledWith({
				newVersion: 'v8.9.10',
				oldVersion: undefined,
			});
			schema.stopPolling();
		});
	});
});

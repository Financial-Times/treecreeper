jest.mock('node-fetch', () => require('fetch-mock-jest').sandbox());
const fetch = require('node-fetch');

jest.useFakeTimers();

const { SchemaUpdater } = require('../updater');
// TODO move into schema-utils
const { RawDataWrapper } = require('../raw-data-wrapper');
const { Cache } = require('../cache');

const create = options =>
	new SchemaUpdater(options, new RawDataWrapper(), new Cache());

const nextTick = () => new Promise(res => process.nextTick(res));

describe('refreshing schema when stale', () => {
	const schemaDir = process.env.TREECREEPER_SCHEMA_DIRECTORY;
	beforeAll(() => {
		delete process.env.TREECREEPER_SCHEMA_DIRECTORY;
	});
	afterAll(() => {
		process.env.TREECREEPER_SCHEMA_DIRECTORY = schemaDir;
	});
	afterEach(() => fetch.reset());
	it('does not fetch on init', async () => {
		create({
			ttl: 100,
			schemaBaseUrl: 'https://base.url',
			updateMode: 'poll',
		});
		fetch.mock('https://base.url/schema.json', { result: true });
		expect(fetch).not.toHaveBeenCalled();
	});
	it('fetches when startPolling method called', async () => {
		const schema = create({
			ttl: 100,
			schemaBaseUrl: 'https://base.url',
			updateMode: 'poll',
		});
		fetch.mock('https://base.url/schema.json', { result: true });
		let isPending = true;
		schema.startPolling().then(() => {
			isPending = false;
		});
		expect(fetch).toHaveBeenCalled();
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
		fetch.mock('https://base.url/schema.json', { result: true });
		schema.startPolling();
		await fetch.flush();
		fetch.resetHistory();
		jest.advanceTimersByTime(101);
		expect(fetch).toHaveBeenCalled();
		schema.stopPolling();
	});

	describe('handle updates', () => {
		it('noop if new version is same as old', async () => {
			const schema = create({
				ttl: 100,
				schemaBaseUrl: 'https://base.url',
				updateMode: 'poll',
			});
			schema.version = 'some-hash';
			const listener = jest.fn();
			schema.on('change', listener);
			fetch.mock('https://base.url/schema.json', {
				version: 'some-hash',
			});
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
				version: 'some-hash',
				schema: {
					types: [
						{
							name: 'NotIt',
						},
					],
				},
			};
			fetch.mock('https://base.url/schema.json', data);
			schema.startPolling();
			await fetch.flush();
			expect(listener).toHaveBeenCalledWith({
				newVersion: 'some-hash',
				oldVersion: undefined,
			});
			schema.stopPolling();
		});
	});
});

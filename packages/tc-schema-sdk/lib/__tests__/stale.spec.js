const fetch = require('node-fetch');

const { SchemaUpdater } = require('../updater');

// TODO move into schema-utils
const { RawDataWrapper } = require('../raw-data-wrapper');
const { Cache } = require('../cache');

const create = options =>
	new SchemaUpdater(options, new RawDataWrapper(), new Cache());

const timer = delay => new Promise(res => setTimeout(res, delay));
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
	it('does not fetch on create', async () => {
		create({
			ttl: 100,
			schemaBaseUrl: 'https://base.url',
			updateMode: 'stale',
		});
		fetch.mock('https://base.url/schema.json', { result: true });
		expect(fetch.called()).toBe(false);
	});
	it('fetches when ready method called', async () => {
		const schema = create({
			ttl: 100,
			schemaBaseUrl: 'https://base.url',
			updateMode: 'stale',
		});
		fetch.mock('https://base.url/schema.json', { result: true });
		let isPending = true;
		schema.ready().then(() => {
			isPending = false;
		});
		expect(fetch.called()).toBe(true);
		expect(isPending).toEqual(true);
		await fetch.flush();
		await nextTick();
		expect(isPending).toEqual(false);
	});

	it('does not fetch if ready method called within TTL', async () => {
		const schema = create({
			ttl: 100,
			schemaBaseUrl: 'https://base.url',
			updateMode: 'stale',
		});
		fetch.mock('https://base.url/schema.json', { result: true });
		schema.ready();
		await fetch.flush();
		fetch.resetHistory();
		await timer(50);
		let isPending = true;
		schema.ready().then(() => {
			isPending = false;
		});
		expect(fetch.called()).toBe(false);
		expect(isPending).toEqual(true);
		await nextTick();
		expect(isPending).toEqual(false);
	});
	it('fetches if ready method called after TTL has expired', async () => {
		const schema = create({
			ttl: 100,
			schemaBaseUrl: 'https://base.url',
			updateMode: 'stale',
		});
		fetch.mock('https://base.url/schema.json', { result: true });
		schema.ready();
		await fetch.flush();
		fetch.resetHistory();
		await timer(101);
		let isPending = true;
		schema.ready().then(() => {
			isPending = false;
		});
		expect(fetch.called()).toBe(true);
		expect(isPending).toEqual(true);
		await fetch.flush();
		await nextTick();
		expect(isPending).toEqual(false);
	});

	describe('handle updates', () => {
		it('noop if new version is same as old', async () => {
			const schema = create({
				ttl: 100,
				schemaBaseUrl: 'https://base.url',
				updateMode: 'stale',
			});

			schema.version = 'some-hash';
			const listener = jest.fn();
			schema.on('change', listener);
			fetch.mock('https://base.url/schema.json', {
				version: 'some-hash',
			});
			schema.ready();
			await fetch.flush();
			expect(listener).not.toHaveBeenCalled();
		});

		it('updates local data nad triggers event when version has changed', async () => {
			const schema = create({
				ttl: 100,
				schemaBaseUrl: 'https://base.url',
				updateMode: 'stale',
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
			schema.ready();
			await fetch.flush();
			expect(listener).toHaveBeenCalledWith({
				newVersion: 'some-hash',
				oldVersion: undefined,
			});
		});
	});
});

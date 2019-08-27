const fetch = require('node-fetch');

jest.mock('../../../package.json', () => ({ version: '8.9.10' }), {
	virtual: true,
});

const { SchemaUpdater } = require('..');

// TODO move into schema-utils
const { RawDataWrapper } = require('../../schema-sdk/raw-data-wrapper');
const { Cache } = require('../../schema-utils');

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
		fetch.mock('https://base.url/v8.json', { result: true });
		expect(fetch.called()).toBe(false);
	});
	it('fetches when ready method called', async () => {
		const schema = create({
			ttl: 100,
			schemaBaseUrl: 'https://base.url',
			updateMode: 'stale',
		});
		fetch.mock('https://base.url/v8.json', { result: true });
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
		fetch.mock('https://base.url/v8.json', { result: true });
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
		fetch.mock('https://base.url/v8.json', { result: true });
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

			schema.version = 'v8.9.10';
			const listener = jest.fn();
			schema.on('change', listener);
			fetch.mock('https://base.url/v8.json', { version: 'v8.9.10' });
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
			schema.ready();
			await fetch.flush();
			expect(listener).toHaveBeenCalledWith({
				newVersion: 'v8.9.10',
				oldVersion: undefined,
			});
		});
	});
});

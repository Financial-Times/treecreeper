const fetch = require('node-fetch');

jest.mock('../../package.json', () => ({ version: '8.9.10' }), {
	virtual: true,
});

const { init } = require('../..');

const timer = delay => new Promise(res => setTimeout(res, delay));
const nextTick = () => new Promise(res => process.nextTick(res));
describe('refreshing schema when stale', () => {
	afterEach(() => fetch.reset());
	it('does not fetch on init', async () => {
		init({ ttl: 100, baseUrl: 'https://base.url', updateMode: 'stale' });
		fetch.mock('https://base.url/v8.json', { result: true });
		expect(fetch.called()).toBe(false);
	});
	it('fetches when refresh method called', async () => {
		const schema = init({
			ttl: 100,
			baseUrl: 'https://base.url',
			updateMode: 'stale',
		});
		fetch.mock('https://base.url/v8.json', { result: true });
		let isPending = true;
		schema.refresh().then(() => {
			isPending = false;
		});
		expect(fetch.called()).toBe(true);
		expect(isPending).toEqual(true);
		await fetch.flush();
		await nextTick();
		expect(isPending).toEqual(false);
	});

	it('does not fetch if refresh method called within TTL', async () => {
		const schema = init({
			ttl: 100,
			baseUrl: 'https://base.url',
			updateMode: 'stale',
		});
		fetch.mock('https://base.url/v8.json', { result: true });
		schema.refresh();
		await fetch.flush();
		fetch.resetHistory();
		await timer(50);
		let isPending = true;
		schema.refresh().then(() => {
			isPending = false;
		});
		expect(fetch.called()).toBe(false);
		expect(isPending).toEqual(true);
		await nextTick();
		expect(isPending).toEqual(false);
	});
	it('fetches if refresh method called after TTL has expired', async () => {
		const schema = init({
			ttl: 100,
			baseUrl: 'https://base.url',
			updateMode: 'stale',
		});
		fetch.mock('https://base.url/v8.json', { result: true });
		schema.refresh();
		await fetch.flush();
		fetch.resetHistory();
		await timer(101);
		let isPending = true;
		schema.refresh().then(() => {
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
			const schema = init({
				ttl: 100,
				baseUrl: 'https://base.url',
				updateMode: 'stale',
				rawData: {
					version: 'v8.9.10',
					schema: {
						types: [
							{
								name: 'It',
							},
						],
					},
				},
			});
			const listener = jest.fn();
			schema.on('change', listener);
			fetch.mock('https://base.url/v8.json', { version: 'v8.9.10' });
			schema.refresh();
			await fetch.flush();
			expect(listener).not.toHaveBeenCalled();
			expect(schema.getType('It')).toEqual(expect.any(Object));
		});

		it('updates local data nad triggers event when version has changed', async () => {
			const schema = init({
				ttl: 100,
				baseUrl: 'https://base.url',
				updateMode: 'stale',
				rawData: {
					version: 'v8.9.11',
					schema: {
						types: [
							{
								name: 'It',
							},
						],
					},
				},
			});
			const listener = jest.fn();
			schema.on('change', listener);
			fetch.mock('https://base.url/v8.json', {
				version: 'v8.9.10',
				schema: {
					types: [
						{
							name: 'NotIt',
						},
					],
				},
			});
			schema.refresh();
			await fetch.flush();
			expect(listener).toHaveBeenCalled();
			expect(schema.getType('NotIt')).toEqual(expect.any(Object));
		});
	});
});

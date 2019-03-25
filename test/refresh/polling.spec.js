const fetch = require('node-fetch');

jest.useFakeTimers();

jest.mock('../../package.json', () => ({ version: '8.9.10' }), {
	virtual: true,
});

const { init } = require('../..');

const nextTick = () => new Promise(res => process.nextTick(res));

describe('refreshing schema when stale', () => {
	afterEach(() => fetch.reset());
	it('does not fetch on init', async () => {
		init({ ttl: 100, baseUrl: 'https://base.url', updateMode: 'poll' });
		fetch.mock('https://base.url/v8.json', { result: true });
		expect(fetch.called()).toBe(false);
	});
	it('fetches when startPolling method called', async () => {
		const schema = init({
			ttl: 100,
			baseUrl: 'https://base.url',
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
		const schema = init({
			ttl: 100,
			baseUrl: 'https://base.url',
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
			const schema = init({
				ttl: 100,
				baseUrl: 'https://base.url',
				updateMode: 'poll',
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
			schema.startPolling();
			await fetch.flush();
			expect(listener).not.toHaveBeenCalled();
			expect(schema.getType('It')).toEqual(expect.any(Object));
			schema.stopPolling();
		});

		it('updates local data nad triggers event when version has changed', async () => {
			const schema = init({
				ttl: 100,
				baseUrl: 'https://base.url',
				updateMode: 'poll',
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
			schema.startPolling();
			await fetch.flush();
			expect(listener).toHaveBeenCalled();
			expect(schema.getType('NotIt')).toEqual(expect.any(Object));
			schema.stopPolling();
		});
	});
});

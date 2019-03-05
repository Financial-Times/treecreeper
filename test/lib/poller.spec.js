/* eslint-disable global-require */
jest.useFakeTimers();

describe('poller', () => {
	let poller;
	let fetch;
	let rawData;
	afterEach(() => {
		poller.stop();
		jest.resetModules();
		jest.clearAllTimers();
	});

	it('exports schema file name based on package.json', async () => {
		jest.doMock('../../package.json', () => ({ version: '1.2.3' }), {
			virtual: true,
		});
		poller = require('../../lib/poller'); // eslint-disable-line global-require

		expect(poller.schemaFileName).toEqual('v1.json');
	});

	describe('polling', () => {
		it('fetches url based on baseUrl and package.json', async () => {
			fetch = require('node-fetch');
			jest.doMock('../../package.json', () => ({ version: '1.2.3' }), {
				virtual: true,
			});
			poller = require('../../lib/poller'); // eslint-disable-line global-require
			fetch.mock('https://base.url/v1.json', { result: true });
			await poller.start('https://base.url');
			expect(fetch.done()).toEqual(true);
		});

		it('adds prerelease to url if prerelease version of library', async () => {
			fetch = require('node-fetch');
			jest.doMock(
				'../../package.json',
				() => ({
					version: '1.2.3-beta.1',
				}),
				{ virtual: true },
			);
			poller = require('../../lib/poller'); // eslint-disable-line global-require
			fetch.mock('https://base.url/v1-prerelease.json', { result: true });
			await poller.start('https://base.url');
			expect(fetch.done()).toEqual(true);
		});

		it('fetches url on interval', async () => {
			fetch = require('node-fetch');
			jest.doMock('../../package.json', () => ({ version: '1.2.3' }), {
				virtual: true,
			});
			poller = require('../../lib/poller'); // eslint-disable-line global-require
			fetch.mock('https://base.url/v1.json', { result: true });
			await poller.start('https://base.url');

			expect(setInterval).toHaveBeenCalledTimes(1);
			expect(setInterval).toHaveBeenLastCalledWith(
				expect.any(Function),
				20000,
				'https://base.url/v1.json',
			);
			jest.advanceTimersByTime(20000);
			expect(fetch.calls().length).toEqual(2);
		});
	});
	describe('handling updates', () => {
		it('no change if existing schema has same version as new one', async () => {
			jest.doMock('../../lib/raw-data', () => ({
				set: jest.fn(),
				getVersion: () => 1,
			}));
			rawData = require('../../lib/raw-data');
			fetch = require('node-fetch');
			jest.doMock('../../package.json', () => ({ version: '1.2.3' }), {
				virtual: true,
			});
			poller = require('../../lib/poller'); // eslint-disable-line global-require
			const listener = jest.fn();
			fetch.mock('https://base.url/v1.json', { version: 1 });

			poller.on('change', listener);
			await poller.start('https://base.url');
			expect(listener).not.toHaveBeenCalled();
		});
		it('overwrites existing schema if has different version', async () => {
			jest.doMock('../../lib/raw-data', () => ({
				set: jest.fn(),
				getVersion: () => 1,
			}));
			rawData = require('../../lib/raw-data');
			fetch = require('node-fetch');
			jest.doMock('../../package.json', () => ({ version: '1.2.3' }), {
				virtual: true,
			});
			poller = require('../../lib/poller'); // eslint-disable-line global-require
			const listener = jest.fn();
			fetch.mock('https://base.url/v1.json', { version: 2 });
			poller.on('change', listener);
			await poller.start('https://base.url');
			expect(listener).toHaveBeenCalled();
			expect(rawData.set).toHaveBeenCalledWith({ version: 2 });
		});
	});
});

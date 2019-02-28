const fetch = require('node-fetch');

jest.mock('../../package.json', () => ({ version: '1.2.3' }));
jest.mock('../../lib/raw-data', () => ({
	set: jest.fn(),
	getVersion: () => 1,
}));

const poller = require('../../lib/poller');
const rawData = require('../../lib/raw-data');
// need to mock package.json

describe('poller', () => {
	afterEach(() => {
		poller.stop();
		fetch.reset();
		rawData.set.mockClear();
	});

	describe('polling', () => {
		it('fetches url based on baseUrl and package.json', () => {
			fetch.mock('https://base.url/v1.json', { result: true });
			poller.start('https://base.url');
			expect(fetch.done()).toEqual(true);
		});
		it.skip('adds prerelease to url if prerelease version of library', () => {
			jest.doMock('../../package.json', () => ({
				version: '1.2.3-beta.1',
			}));
			const prereleasePoller = require('../../lib/poller'); // eslint-disable-line global-require
			fetch.mock('https://base.url/v1-prerelease.json', { result: true });
			prereleasePoller.start('https://base.url');
			expect(fetch.done()).toEqual(true);
		});
		it.skip('fetches url on interval', () => {});
	});
	describe('handling updates', () => {
		it('no change if existing schema has same version as new one', async () => {
			const listener = jest.fn();
			fetch.mock('https://base.url/v1.json', { version: 1 });
			poller.on('change', listener);
			poller.start('https://base.url');
			await new Promise(res => setTimeout(res, 0));
			expect(listener).not.toHaveBeenCalled();
		});
		it('overwrites existing schema if has different version', async () => {
			const listener = jest.fn();
			fetch.mock('https://base.url/v1.json', { version: 2 });
			poller.on('change', listener);
			poller.start('https://base.url');
			await new Promise(res => setTimeout(res, 0));
			expect(listener).toHaveBeenCalled();
			expect(rawData.set).toHaveBeenCalledWith({ version: 2 });
		});
	});
});

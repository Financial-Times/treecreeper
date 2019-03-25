const Cache = require('../../lib/cache');

const cache = new Cache();

describe('cache spec', () => {
	let func;

	let keyGetter;

	let cacheified;
	beforeAll(() => {
		func = jest.fn(val => 2 * val);

		keyGetter = jest.fn(val => `key:${val}`);

		cacheified = cache.cacheify(func, keyGetter);
	});

	afterEach(() => jest.clearAllMocks());

	afterAll(() => cache.clear());

	it('calls cacheified function on first call', () => {
		const result = cacheified(3);
		expect(result).toBe(6);
		expect(func).toHaveBeenCalledWith(3);
		expect(keyGetter).toHaveBeenCalledWith(3);
	});
	it("doesn't call cacheified function on second call", () => {
		const result = cacheified(3);
		expect(result).toBe(6);
		expect(func).not.toHaveBeenCalled();
		expect(keyGetter).toHaveBeenCalledWith(3);
	});
	it('calls cacheified function if different cache key generated', () => {
		const result = cacheified(4);
		expect(result).toBe(8);
		expect(func).toHaveBeenCalledWith(4);
		expect(keyGetter).toHaveBeenCalledWith(4);
	});
	it("doesn't retrieve from cache if cache cleared", () => {
		cache.clear();
		const result = cacheified(4);
		expect(result).toBe(8);
		expect(func).toHaveBeenCalledWith(4);
		expect(keyGetter).toHaveBeenCalledWith(4);
	});
});

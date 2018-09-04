const cache = require('../../lib/cache');
const sinon = require('sinon')
describe.only('cache spec', () => {
	let func

	let keyGetter

	let cacheified
	let sandbox
	before (() => {
		sandbox = sinon.createSandbox();
		func = sandbox.stub()
		func.callsFake(val => 2 * val)

		keyGetter = sandbox.stub()
		keyGetter.callsFake(val => `key:${val}`)

	 	cacheified = cache.cacheify(func, keyGetter)

	})

	afterEach(() => sandbox.resetHistory())

	after (() => cache.clear())
	it("calls cacheified function on first call", () => {
		const result = cacheified(3);
		expect(result).to.equal(6);
		expect(func).calledWith(3);
		expect(keyGetter).calledWith(3);
	});
	it("doesn't call cacheified function on second call", () => {
		const result = cacheified(3);
		expect(result).to.equal(6);
		expect(func).not.called;
		expect(keyGetter).calledWith(3);
	});
	it("calls cacheified function if different cache key generated", () => {
		const result = cacheified(4);
		expect(result).to.equal(8);
		expect(func).calledWith(4);
		expect(keyGetter).calledWith(4);
	});
	it("doesn't retrieve from cache if cache cleared", () => {
		cache.clear();
		const result = cacheified(4);
		expect(result).to.equal(8);
		expect(func).calledWith(4);
		expect(keyGetter).calledWith(4);
	})
});

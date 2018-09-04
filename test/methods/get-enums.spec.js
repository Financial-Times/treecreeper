const { getEnums } = require('../../');
const rawData = require('../../lib/raw-data');
const sinon = require('sinon');
const cache = require('../../lib/cache');

describe.skip('get-enums', () => {
	const sandbox = sinon.createSandbox();

	beforeEach(() => {
		sandbox.stub(rawData, 'getEnums');
	});

	afterEach(() => {
		cache.clear();
		sandbox.restore();
	});

	it('retrieve enums', () => {
		rawData.getEnums.returns({
			enum1: {
				description: 'ab',
				options: ['a']
			}
		});
		expect(getEnums()).to.eql({ enum1: { a: 'a' } });
	});

	it('retrieve enums with metadata', () => {
		rawData.getEnums.returns({
			enum1: {
				description: 'ab',
				options: ['a']
			}
		});
		expect(getEnums({ withMeta: true })).to.eql({
			enum1: { description: 'ab', options: { a: 'a' } }
		});
	});

	it('convert arrays into key/value maps', () => {
		rawData.getEnums.returns({
			enum1: {
				options: ['a', 'b', 'c']
			}
		});
		expect(getEnums()).to.eql({ enum1: { a: 'a', b: 'b', c: 'c' } });
	});

	it('retrieve key/value maps unaltered', () => {
		rawData.getEnums.returns({
			enum1: {
				options: {
					a: 1,
					b: 2,
					c: 3
				}
			}
		});
		expect(getEnums()).to.eql({ enum1: { a: 1, b: 2, c: 3 } });
	});
});

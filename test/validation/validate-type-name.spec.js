const getType = require('../../methods/get-type');
const { validateTypeName } = require('../..');

jest.mock('../../methods/get-type');

describe('validateTypeName', () => {
	beforeEach(() => {
		jest.mock('../../methods/get-type');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	it('accept names in the list', () => {
		getType.mockReturnValue({
			name: 'Thing',
		});
		expect(() => validateTypeName('Thing')).not.toThrow();
	});
	it('reject names not in the list', () => {
		getType.mockReturnValue();
		expect(() => validateTypeName('Thingo')).toThrow(/Invalid node type/);
	});
});

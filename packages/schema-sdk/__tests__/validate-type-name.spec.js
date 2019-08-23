const { init } = require('../get-instance');

describe('validateTypeName', () => {
	const { validateTypeName } = init({
		rawData: {
			schema: {
				types: [
					{
						name: 'Thing',
					},
				],
				enums: {},
			},
		},
	});

	it('accept names in the list', () => {
		expect(() => validateTypeName('Thing')).not.toThrow();
	});
	it('reject names not in the list', () => {
		expect(() => validateTypeName('Thingo')).toThrow(/Invalid type/);
	});
});

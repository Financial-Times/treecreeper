const { SDK } = require('../sdk');

describe('validateTypeName', () => {
	const {
		validators: { validateTypeName },
	} = new SDK({
		schemaData: {
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

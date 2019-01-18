const getType = require('../../methods/get-type');
const getEnums = require('../../methods/get-enums');
const { validateProperty } = require('../..');
const primitiveTypesMap = require('../../lib/primitive-types-map');

jest.mock('../../methods/get-type');
jest.mock('../../methods/get-enums');

describe('validateProperty', () => {
	beforeEach(() => {
		jest.mock('../../methods/get-type');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	it('not accept if not in schema', () => {
		getType.mockReturnValue({
			name: 'Thing',
			properties: {
				prop: {
					type: 'Boolean',
				},
			},
		});
		expect(() => validateProperty('Thing', 'prop1', true)).toThrow(
			/Invalid property `prop1` on type `Thing`/,
		);
	});

	describe('validating strings', () => {
		Object.entries(primitiveTypesMap).forEach(
			([bizOpsType, graphqlType]) => {
				if (graphqlType === 'String') {
					beforeEach(() => {
						getType.mockReturnValue({
							name: 'Thing',
							properties: {
								prop: {
									type: bizOpsType,
									validator: /^[^z]+$/, // exclude the letter z
								},
							},
						});
					});
					it('accept strings', () => {
						expect(() =>
							validateProperty(
								'Thing',
								'prop',
								'I am Tracy Beaker',
							),
						).not.toThrow();
					});
					it('not accept booleans', () => {
						expect(() =>
							validateProperty('Thing', 'prop', true),
						).toThrow(/Must be a string/);
						expect(() =>
							validateProperty('Thing', 'prop', false),
						).toThrow(/Must be a string/);
					});
					it('not accept floats', () => {
						expect(() =>
							validateProperty('Thing', 'prop', 1.34),
						).toThrow(/Must be a string/);
					});
					it('not accept integers', () => {
						expect(() =>
							validateProperty('Thing', 'prop', 134),
						).toThrow(/Must be a string/);
					});
					it('apply string patterns', () => {
						expect(() =>
							validateProperty('Thing', 'prop', 'I am zebbedee'),
						).toThrow(/Must match pattern/);
					});
				}
			},
		);
	});
	describe('validating booleans', () => {
		beforeEach(() => {
			getType.mockReturnValue({
				name: 'Thing',
				properties: {
					prop: {
						type: 'Boolean',
					},
				},
			});
		});

		it('not accept strings', () => {
			expect(() =>
				validateProperty('Thing', 'prop', 'I am Tracy Beaker'),
			).toThrow(/Must be a Boolean/);
		});
		it('accept booleans', () => {
			expect(() => validateProperty('Thing', 'prop', true)).not.toThrow();
			expect(() =>
				validateProperty('Thing', 'prop', false),
			).not.toThrow();
		});
		it('not accept floats', () => {
			expect(() => validateProperty('Thing', 'prop', 1.34)).toThrow(
				/Must be a Boolean/,
			);
		});
		it('not accept integers', () => {
			expect(() => validateProperty('Thing', 'prop', 134)).toThrow(
				/Must be a Boolean/,
			);
		});
	});
	describe('validating floats', () => {
		beforeEach(() => {
			getType.mockReturnValue({
				name: 'Thing',
				properties: {
					prop: {
						type: 'Float',
					},
				},
			});
		});

		it('not accept strings', () => {
			expect(() =>
				validateProperty('Thing', 'prop', 'I am Tracy Beaker'),
			).toThrow(/Must be a finite floating point number/);
		});
		it('not accept booleans', () => {
			expect(() => validateProperty('Thing', 'prop', true)).toThrow(
				/Must be a finite floating point number/,
			);
			expect(() => validateProperty('Thing', 'prop', false)).toThrow(
				/Must be a finite floating point number/,
			);
		});
		it('accept floats', () => {
			expect(() => validateProperty('Thing', 'prop', 1.34)).not.toThrow();
		});
		it('accept integers', () => {
			expect(() => validateProperty('Thing', 'prop', 134)).not.toThrow();
		});
	});

	describe('validating integers', () => {
		beforeEach(() => {
			getType.mockReturnValue({
				name: 'Thing',
				properties: {
					prop: {
						type: 'Int',
					},
				},
			});
		});

		it('not accept strings', () => {
			expect(() =>
				validateProperty('Thing', 'prop', 'I am Tracy Beaker'),
			).toThrow(/Must be a finite integer/);
		});
		it('not accept booleans', () => {
			expect(() => validateProperty('Thing', 'prop', true)).toThrow(
				/Must be a finite integer/,
			);
			expect(() => validateProperty('Thing', 'prop', false)).toThrow(
				/Must be a finite integer/,
			);
		});
		it('not accept floats', () => {
			expect(() => validateProperty('Thing', 'prop', 1.34)).toThrow(
				/Must be a finite integer/,
			);
		});
		it('accept integers', () => {
			expect(() => validateProperty('Thing', 'prop', 134)).not.toThrow();
		});
	});
	describe('validating enums', () => {
		beforeEach(() => {
			getType.mockReturnValue({
				name: 'Thing',
				properties: {
					prop: {
						type: 'MyEnum',
					},
				},
			});
			getEnums.mockReturnValue({
				MyEnum: {
					bear: 'grylls',
					ray: 'winstone',
				},
			});
		});
		it('accept value defined in a mapping enum', () => {
			expect(() =>
				validateProperty('Thing', 'prop', 'grylls'),
			).not.toThrow();
		});

		it('not accept value not defined in a mapping enum', () => {
			expect(() => validateProperty('Thing', 'prop', 'ban')).toThrow(
				/Must be a valid enum/,
			);
		});
	});

	describe('validating relationships', () => {
		beforeEach(() => {
			getType.mockImplementation(type =>
				type === 'StartType'
					? {
							name: 'StartType',
							properties: {
								testRelationship: {
									type: 'EndType',
									direction: 'outgoing',
									relationship: 'HAS',
									hasMany: false,
								},
							},
					  }
					: {
							name: 'EndType',
							properties: {
								code: { validator: /^[a-z]+$/, type: 'String' },
							},
					  },
			);
		});
		it('reject when related node code is invalid', () => {
			expect(() =>
				validateProperty('StartType', 'testRelationship', 'CODE'),
			).toThrow(
				/Invalid value `CODE` for property `code` on type `EndType`/,
			);
		});

		it('accept when all is correct', () => {
			expect(() =>
				validateProperty('StartType', 'testRelationship', 'code'),
			).not.toThrow();
		});
	});
});

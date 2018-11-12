const getType = require('../../methods/get-type');
const getEnums = require('../../methods/get-enums');
const { validateAttributes } = require('../../');
const primitiveTypesMap = require('../../lib/primitive-types-map');

jest.mock('../../methods/get-type');
jest.mock('../../methods/get-enums');

describe('validateAttributes', () => {
	beforeEach(() => {
		jest.mock('../../methods/get-type');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	describe('validating strings', () => {
		Object.entries(primitiveTypesMap).forEach(([bizOpsType, graphqlType]) => {
			if (graphqlType === 'String') {
				beforeEach(() => {
					getType.mockReturnValue({
						name: 'Thing',
						properties: {
							prop: {
								type: bizOpsType,
								validator: /^[^z]+$/ //exclude the letter z
							}
						}
					});
				});
				it('accept strings', () => {
					expect(() =>
						validateAttributes('Thing', { prop: 'I am Tracy Beaker' })
					).not.toThrowError();
				});
				it('not accept booleans', () => {
					expect(() =>
						validateAttributes('Thing', { prop: true })
					).toThrowError(/Must be a string/);
					expect(() =>
						validateAttributes('Thing', { prop: false })
					).toThrowError(/Must be a string/);
				});
				it('not accept floats', () => {
					expect(() =>
						validateAttributes('Thing', { prop: 1.34 })
					).toThrowError(/Must be a string/);
				});
				it('not accept integers', () => {
					expect(() => validateAttributes('Thing', { prop: 134 })).toThrowError(
						/Must be a string/
					);
				});
				it('apply string patterns', () => {
					expect(() =>
						validateAttributes('Thing', { prop: 'I am zebbedee' })
					).toThrowError(/Must match pattern/);
				});
			}
		});
	});
	describe('validating booleans', () => {
		beforeEach(() => {
			getType.mockReturnValue({
				name: 'Thing',
				properties: {
					prop: {
						type: 'Boolean'
					}
				}
			});
		});

		it('not accept strings', () => {
			expect(() =>
				validateAttributes('Thing', { prop: 'I am Tracy Beaker' })
			).toThrowError(/Must be a Boolean/);
		});
		it('accept booleans', () => {
			expect(() =>
				validateAttributes('Thing', { prop: true })
			).not.toThrowError();
			expect(() =>
				validateAttributes('Thing', { prop: false })
			).not.toThrowError();
		});
		it('not accept floats', () => {
			expect(() => validateAttributes('Thing', { prop: 1.34 })).toThrowError(
				/Must be a Boolean/
			);
		});
		it('not accept integers', () => {
			expect(() => validateAttributes('Thing', { prop: 134 })).toThrowError(
				/Must be a Boolean/
			);
		});
	});
	describe('validating floats', () => {
		beforeEach(() => {
			getType.mockReturnValue({
				name: 'Thing',
				properties: {
					prop: {
						type: 'Float'
					}
				}
			});
		});

		it('not accept strings', () => {
			expect(() =>
				validateAttributes('Thing', { prop: 'I am Tracy Beaker' })
			).toThrowError(/Must be a finite floating point number/);
		});
		it('not accept booleans', () => {
			expect(() => validateAttributes('Thing', { prop: true })).toThrowError(
				/Must be a finite floating point number/
			);
			expect(() => validateAttributes('Thing', { prop: false })).toThrowError(
				/Must be a finite floating point number/
			);
		});
		it('accept floats', () => {
			expect(() =>
				validateAttributes('Thing', { prop: 1.34 })
			).not.toThrowError();
		});
		it('accept integers', () => {
			expect(() =>
				validateAttributes('Thing', { prop: 134 })
			).not.toThrowError();
		});
	});

	describe('validating integers', () => {
		beforeEach(() => {
			getType.mockReturnValue({
				name: 'Thing',
				properties: {
					prop: {
						type: 'Int'
					}
				}
			});
		});

		it('not accept strings', () => {
			expect(() =>
				validateAttributes('Thing', { prop: 'I am Tracy Beaker' })
			).toThrowError(/Must be a finite integer/);
		});
		it('not accept booleans', () => {
			expect(() => validateAttributes('Thing', { prop: true })).toThrowError(
				/Must be a finite integer/
			);
			expect(() => validateAttributes('Thing', { prop: false })).toThrowError(
				/Must be a finite integer/
			);
		});
		it('not accept floats', () => {
			expect(() => validateAttributes('Thing', { prop: 1.34 })).toThrowError(
				/Must be a finite integer/
			);
		});
		it('accept integers', () => {
			expect(() =>
				validateAttributes('Thing', { prop: 134 })
			).not.toThrowError();
		});
	});
	describe('validating enums', () => {
		beforeEach(() => {
			getType.mockReturnValue({
				name: 'Thing',
				properties: {
					prop: {
						type: 'MyEnum'
					}
				}
			});
			getEnums.mockReturnValue({
				MyEnum: {
					bear: 'grylls',
					ray: 'winstone'
				}
			});
		});
		it('accept value defined in a mapping enum', () => {
			expect(() =>
				validateAttributes('Thing', { prop: 'grylls' })
			).not.toThrowError();
		});

		it('not accept value not defined in a mapping enum', () => {
			expect(() => validateAttributes('Thing', { prop: 'ban' })).toThrowError(
				/Must be a valid enum/
			);
		});
	});
});

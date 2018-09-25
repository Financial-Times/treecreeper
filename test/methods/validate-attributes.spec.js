const sinon = require('sinon');
const getType = require('../../methods/get-type');
const getEnums = require('../../methods/get-enums');
const { validateAttributes } = require('../../');
const primitiveTypesMap = require('../../lib/primitive-types-map')
describe('validateAttributes', () => {
	const sandbox = sinon.createSandbox();
	beforeEach(() => {
		sandbox.stub(getType, 'method');
	});

	afterEach(() => sandbox.restore());
	describe('validating strings', () => {
		Object.entries(primitiveTypesMap).forEach(([bizOpsType, graphqlType]) => {
			if (graphqlType === 'String') {
				beforeEach(() => {
					getType.method.returns({
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
					).not.to.throw();
				});
				it('not accept booleans', () => {
					expect(() => validateAttributes('Thing', { prop: true })).to.throw(
						/Must be a string/
					);
					expect(() => validateAttributes('Thing', { prop: false })).to.throw(
						/Must be a string/
					);
				});
				it('not accept floats', () => {
					expect(() => validateAttributes('Thing', { prop: 1.34 })).to.throw(
						/Must be a string/
					);
				});
				it('not accept integers', () => {
					expect(() => validateAttributes('Thing', { prop: 134 })).to.throw(
						/Must be a string/
					);
				});
				it('apply string patterns', () => {
					expect(() =>
						validateAttributes('Thing', { prop: 'I am zebbedee' })
					).to.throw(/Must match pattern/);
				});
			}
		})

	});
	describe('validating booleans', () => {
		beforeEach(() => {
			getType.method.returns({
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
			).to.throw(/Must be a Boolean/);
		});
		it('accept booleans', () => {
			expect(() => validateAttributes('Thing', { prop: true })).not.to.throw();
			expect(() => validateAttributes('Thing', { prop: false })).not.to.throw();
		});
		it('not accept floats', () => {
			expect(() => validateAttributes('Thing', { prop: 1.34 })).to.throw(
				/Must be a Boolean/
			);
		});
		it('not accept integers', () => {
			expect(() => validateAttributes('Thing', { prop: 134 })).to.throw(
				/Must be a Boolean/
			);
		});
	});
	describe('validating floats', () => {
		beforeEach(() => {
			getType.method.returns({
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
			).to.throw(/Must be a finite floating point number/);
		});
		it('not accept booleans', () => {
			expect(() => validateAttributes('Thing', { prop: true })).to.throw(
				/Must be a finite floating point number/
			);
			expect(() => validateAttributes('Thing', { prop: false })).to.throw(
				/Must be a finite floating point number/
			);
		});
		it('accept floats', () => {
			expect(() => validateAttributes('Thing', { prop: 1.34 })).not.to.throw();
		});
		it('accept integers', () => {
			expect(() => validateAttributes('Thing', { prop: 134 })).not.to.throw();
		});
	});

	describe('validating integers', () => {
		beforeEach(() => {
			getType.method.returns({
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
			).to.throw(/Must be a finite integer/);
		});
		it('not accept booleans', () => {
			expect(() => validateAttributes('Thing', { prop: true })).to.throw(
				/Must be a finite integer/
			);
			expect(() => validateAttributes('Thing', { prop: false })).to.throw(
				/Must be a finite integer/
			);
		});
		it('not accept floats', () => {
			expect(() => validateAttributes('Thing', { prop: 1.34 })).to.throw(
				/Must be a finite integer/
			);
		});
		it('accept integers', () => {
			expect(() => validateAttributes('Thing', { prop: 134 })).not.to.throw();
		});
	});
	describe('validating enums', () => {
		beforeEach(() => {
			getType.method.returns({
				name: 'Thing',
				properties: {
					prop: {
						type: 'MyEnum'
					}
				}
			});
			sandbox.stub(getEnums, 'method').returns({
				MyEnum: {
					bear: 'grylls',
					ray: 'winstone'
				}
			});
		});
		it('accept value defined in a mapping enum', () => {
			expect(() =>
				validateAttributes('Thing', { prop: 'grylls' })
			).not.to.throw();
		});

		it('not accept value not defined in a mapping enum', () => {
			expect(() => validateAttributes('Thing', { prop: 'ban' })).to.throw(
				/Must be a valid enum/
			);
		});
	});
});

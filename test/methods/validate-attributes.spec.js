const sinon = require('sinon');
const getType = require('../../methods/get-type');
const {validateAttributes} = require('../../')
const getValidatorWithSchema = (types, enums) => {
	return proxyquire('../../server/crud/schema-compliance', {
		'../../schema': {
			typesSchema: [types],
			enumsSchema: enums || {}
		}
	}).validateNodeAttributes;
};

describe.only('validateAttributes', () => {
	const sandbox = sinon.createSandbox();
	beforeEach(() => {
		sandbox.stub(getType, 'method')
	})

	afterEach(() => sandbox.restore())
	describe('validating strings', () => {
		before(() => {
			getType.method.returns({
				name: 'Thing',
				properties: {
					prop: {
						type: 'String',
						pattern: /^[^z]+$/ //exclude the letter z
					}
				}
			})
		})
		it('accept strings', () => {
			expect(() =>
				validateAttributes('Thing', { prop: 'I am Tracy Beaker' })
			).not.to.throw();
		});
		it('not accept booleans', () => {
			expect(() => validateAttributes('Thing', { prop: true })).to.throw();
			expect(() => validateAttributes('Thing', { prop: false })).to.throw();
		});
		it('not accept floats', () => {
			expect(() => validateAttributes('Thing', { prop: 1.34 })).to.throw();
		});
		it('not accept integers', () => {
			expect(() => validateAttributes('Thing', { prop: 134 })).to.throw();
		});
		it('apply string patterns', () => {
			expect(() => validateAttributes('Thing', { prop: 'I am zebbedee' })).to.throw();
		});
	});
	describe('validating booleans', () => {
		const validator = getValidatorWithSchema({
			name: 'Thing',
			properties: {
				prop: {
					type: 'Boolean'
				}
			}
		});

		it('not accept strings', () => {
			expect(() =>
				validator('Thing', { prop: 'I am Tracy Beaker' })
			).to.throw();
		});
		it('accept booleans', () => {
			expect(() => validator('Thing', { prop: true })).not.to.throw();
			expect(() => validator('Thing', { prop: false })).not.to.throw();
		});
		it('not accept floats', () => {
			expect(() => validator('Thing', { prop: 1.34 })).to.throw();
		});
		it('not accept integers', () => {
			expect(() => validator('Thing', { prop: 134 })).to.throw();
		});
	});
	describe('validating floats', () => {
		const validator = getValidatorWithSchema({
			name: 'Thing',
			properties: {
				prop: {
					type: 'Float'
				}
			}
		});

		it('not accept strings', () => {
			expect(() =>
				validator('Thing', { prop: 'I am Tracy Beaker' })
			).to.throw();
		});
		it('not accept booleans', () => {
			expect(() => validator('Thing', { prop: true })).to.throw();
			expect(() => validator('Thing', { prop: false })).to.throw();
		});
		it('accept floats', () => {
			expect(() => validator('Thing', { prop: 1.34 })).not.to.throw();
		});
		it('accept integers', () => {
			expect(() => validator('Thing', { prop: 134 })).not.to.throw();
		});
	});

	describe('validating integers', () => {
		const validator = getValidatorWithSchema({
			name: 'Thing',
			properties: {
				prop: {
					type: 'Int'
				}
			}
		});

		it('not accept strings', () => {
			expect(() =>
				validator('Thing', { prop: 'I am Tracy Beaker' })
			).to.throw();
		});
		it('not accept booleans', () => {
			expect(() => validator('Thing', { prop: true })).to.throw();
			expect(() => validator('Thing', { prop: false })).to.throw();
		});
		it('not accept floats', () => {
			expect(() => validator('Thing', { prop: 1.34 })).to.throw();
		});
		it('accept integers', () => {
			expect(() => validator('Thing', { prop: 134 })).not.to.throw();
		});
	});
	describe('validating enums', () => {
		const validator = getValidatorWithSchema(
			{
				name: 'Thing',
				properties: {
					prop: {
						type: 'MyEnum'
					},
					prop2: {
						type: 'MyMappingEnum'
					}
				}
			},
			{
				MyEnum: {
					options: ['kittiwake', 'guillemot']
				},
				MyMappingEnum: {
					options: {
						bear: 'grylls',
						ray: 'winstone'
					}
				}
			}
		);
		it('accept value defined in a simple enum', () => {
			expect(() => validator('Thing', { prop: 'kittiwake' })).not.to.throw();
		});

		it('not accept value not defined in a simple enum', () => {
			expect(() => validator('Thing', { prop: 'fulmar' })).to.throw();
		});

		it('accept value defined in a mapping enum', () => {
			expect(() => validator('Thing', { prop2: 'grylls' })).not.to.throw();
		});

		it('not accept value not defined in a mapping enum', () => {
			expect(() => validator('Thing', { prop2: 'ban' })).to.throw();
		});
	});
});

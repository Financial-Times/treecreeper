const proxyquire = require('proxyquire');
const { expect } = require('chai');
const { setupMocks } = require('./helpers');
const request = require('../helpers/supertest');
const sinon = require('sinon');
const { executeQuery } = require('../../server/lib/db-connection');

const getValidatorWithSchema = (types, enums) => {
	return proxyquire('../../server/crud/schema-compliance', {
		'../../schema': {
			typesSchema: [types],
			enumsSchema: enums || {}
		}
	}).validateNodeAttributes;
};

describe('node attributes schema compliance', () => {
	describe('integration with api', () => {
		const state = {};
		let sb;

		setupMocks(state);
		const schemaCompliance = require('../../server/crud/schema-compliance');

		let app;
		const cleanUp = async () => {
			await executeQuery(`MATCH (n:Team { code: "new-team" }) DETACH DELETE n`);
		};
		before(() => {
			cleanUp();
			sb = sinon.sandbox.create();
			sb.stub(schemaCompliance, 'validateNodeAttributes');
			// using proxyquire to bust cache;
			app = proxyquire('../../server/app.js', {});
			return app;
		});
		afterEach(() => {
			cleanUp();
			sb.reset();
		});
		after(() => {
			sb.restore();
		});

		it('should call when POSTing node', async () => {
			await request(app, { useCached: false })
				.post('/v1/node/Team/new-team')
				.auth('create-client-id')
				.set('x-request-id', 'create-request-id')
				.send({
					node: {
						foo: 'created'
					}
				});

			expect(schemaCompliance.validateNodeAttributes).calledWith('Team', {
				foo: 'created'
			});
		});
		it('should call when PATCHing node', async () => {
			await request(app, { useCached: false })
				.patch('/v1/node/Team/new-team')
				.auth('update-client-id')
				.set('x-request-id', 'update-request-id')
				.send({
					node: {
						foo: 'updated'
					}
				});
			expect(schemaCompliance.validateNodeAttributes).calledWith('Team', {
				foo: 'updated'
			});
		});
	});

	describe('validating strings', () => {
		const validator = getValidatorWithSchema({
			name: 'Thing',
			properties: {
				prop: {
					type: 'String',
					pattern: /^[^z]+$/ //exclude the letter z
				}
			}
		});

		it('accept strings', () => {
			expect(() =>
				validator('Thing', { prop: 'I am Tracy Beaker' })
			).not.to.throw();
		});
		it('not accept booleans', () => {
			expect(() => validator('Thing', { prop: true })).to.throw();
			expect(() => validator('Thing', { prop: false })).to.throw();
		});
		it('not accept floats', () => {
			expect(() => validator('Thing', { prop: 1.34 })).to.throw();
		});
		it('not accept integers', () => {
			expect(() => validator('Thing', { prop: 134 })).to.throw();
		});
		it('apply string patterns', () => {
			expect(() => validator('Thing', { prop: 'I am zebbedee' })).to.throw();
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

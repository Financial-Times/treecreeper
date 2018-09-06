const proxyquire = require('proxyquire');
const { expect } = require('chai');
const { setupMocks } = require('./helpers');
const request = require('../helpers/supertest');
const sinon = require('sinon');
const { executeQuery } = require('../../server/lib/db-connection');

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
			sb = sinon.createSandbox();
			sb.stub(schemaCompliance, 'validateAttributes');
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
			expect(schemaCompliance.validateAttributes).calledWith('Team', {
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
			expect(schemaCompliance.validateAttributes).calledWith('Team', {
				foo: 'updated'
			});
		});
	});
});

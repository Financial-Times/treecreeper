const proxyquire = require('proxyquire');
const { expect } = require('chai');
const { setupMocks } = require('../v1/helpers');
const request = require('../helpers/supertest');
const sinon = require('sinon');
const { executeQuery } = require('../../server/lib/db-connection');

describe('salesforce sync', () => {
	describe('integration with api', () => {
		const state = {};
		let sb;

		setupMocks(state);
		const salesForceSync = require('../../server/lib/salesforce-sync');

		let app;
		const cleanUp = async () => {
			await executeQuery(
				`MATCH (n:System { code: "salesforce-sync-system" }) DETACH DELETE n`
			);
			await executeQuery(
				`MATCH (n:Team { code: "salesforce-sync-team" }) DETACH DELETE n`
			);
		};
		before(() => {
			cleanUp();
			sb = sinon.createSandbox();
			sb.stub(salesForceSync, 'setSalesforceIdForSystem');
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

		it('should call when POSTing System', async () => {
			await request(app, { useCached: false })
				.post('/v1/node/System/salesforce-sync-system')
				.auth('create-client-id')
				.set('x-request-id', 'create-request-id')
				.send({
					node: {
						foo: 'created'
					}
				});
			expect(salesForceSync.setSalesforceIdForSystem).calledOnce;
			expect(
				salesForceSync.setSalesforceIdForSystem.args[0][0].node.code
			).to.equal('salesforce-sync-system');
		});

		it('should call when PATCHing System', async () => {
			await request(app, { useCached: false })
				.patch('/v1/node/System/salesforce-sync-system')
				.auth('update-client-id')
				.set('x-request-id', 'update-request-id')
				.send({
					node: {
						foo: 'updated'
					}
				});
			expect(salesForceSync.setSalesforceIdForSystem).calledOnce;
			expect(
				salesForceSync.setSalesforceIdForSystem.args[0][0].node.code
			).to.equal('salesforce-sync-system');
		});

		it('should not call when POSTing non System', async () => {
			await request(app, { useCached: false })
				.post('/v1/node/Team/salesforce-sync-team')
				.auth('create-client-id')
				.set('x-request-id', 'create-request-id')
				.send({
					node: {
						foo: 'created'
					}
				});
			expect(salesForceSync.setSalesforceIdForSystem).not.called;
		});

		it('should not call when PATCHing non System', async () => {
			await request(app, { useCached: false })
				.patch('/v1/node/Team/salesforce-sync-team')
				.auth('update-client-id')
				.set('x-request-id', 'update-request-id')
				.send({
					node: {
						foo: 'updated'
					}
				});
			expect(salesForceSync.setSalesforceIdForSystem).not.called;
		});
	});

	describe('getting id from salesforce', () => {
		let sb;
		let sfSync;
		let loginStub;
		let sobjectStub;
		let createStub;
		let neoStub;
		let Connection;
		before(() => {
			sb = sinon.createSandbox();
			Connection = class Connection {
				login(...args) {
					return loginStub(...args);
				}
				sobject(...args) {
					return sobjectStub(...args);
				}
			};
			loginStub = sb.stub().callsFake(() => Promise.resolve(new Connection()));
			createStub = sb
				.stub()
				.callsFake(() => Promise.resolve({ id: 'test-id' }));
			sobjectStub = sb.stub().returns({
				create: createStub
			});
			neoStub = sb.stub().resolves('ok');

			sfSync = proxyquire('../../server/lib/salesforce-sync', {
				jsforce: {
					Connection
				},
				'./db-connection': {
					executeQuery: neoStub
				}
			});
		});
		afterEach(() => {
			sb.resetHistory();
		});
		after(() => {
			sb.restore();
		});

		it("doesn't call if no salesforce user defined", async () => {
			await sfSync.setSalesforceIdForSystem({ node: { code: 'elephants' } });
			expect(loginStub).not.called;
		});

		describe('when salesforce user defined', () => {
			before(() => {
				process.env.SALESFORCE_USER = 'test-sf-user';
				process.env.SALESFORCE_PASSWORD = 'test-sf-password';
				process.env.SALESFORCE_TOKEN = 'test-sf-token';
			});

			it("doesn't call if SF_ID already exists in biz-ops", async () => {
				await sfSync.setSalesforceIdForSystem({
					node: { code: 'elephants', SF_ID: '12345' }
				});
				expect(loginStub).not.called;
			});

			it('logs in to salesforce', async () => {
				await sfSync.setSalesforceIdForSystem({ node: { code: 'elephants' } });
				expect(loginStub).calledWith(
					'test-sf-user',
					'test-sf-passwordtest-sf-token'
				);
			});

			it('calls with minimal set of data to create System', async () => {
				await sfSync.setSalesforceIdForSystem({
					node: { code: 'elephants', name: 'We Elephants' }
				});
				expect(sobjectStub).calledWith('BMCServiceDesk__BMC_BaseElement__c');
				expect(createStub).calledWith({
					BMCServiceDesk__Description__c:
						'See https://dewey.in.ft.com/view/system/elephants',
					BMCServiceDesk__Name__c: 'We Elephants',
					BMCServiceDesk__TokenId__c: 'We Elephants',
					Name: 'We Elephants',
					RecordTypeId: '012D0000000Qn40IAC',
					System_Code__c: 'elephants'
				});
			});
			it('uses code if no name specified', async () => {
				await sfSync.setSalesforceIdForSystem({
					node: { code: 'elephants' }
				});
				expect(sobjectStub).calledWith('BMCServiceDesk__BMC_BaseElement__c');
				expect(createStub).calledWith({
					BMCServiceDesk__Description__c:
						'See https://dewey.in.ft.com/view/system/elephants',
					BMCServiceDesk__Name__c: 'elephants',
					BMCServiceDesk__TokenId__c: 'elephants',
					Name: 'elephants',
					RecordTypeId: '012D0000000Qn40IAC',
					System_Code__c: 'elephants'
				});
			});
			it('saves SF_ID to system', async () => {
				await sfSync.setSalesforceIdForSystem({
					node: { code: 'elephants', name: 'We Elephants' }
				});
				expect(neoStub).calledWith(
					'MATCH (s:System {code: $code}) SET s.SF_ID = $SF_ID RETURN s',
					{ code: 'elephants', SF_ID: 'test-id' }
				);
			});
		});
	});
});

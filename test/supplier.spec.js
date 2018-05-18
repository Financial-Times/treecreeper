const proxyquire = require('proxyquire');
const { stub } = require('sinon');
const { expect } = require('chai');
const dbRun = stub();
const send = stub();
const end = stub();
const {
	emptySubmissions,
	submissionsToCloneFrom
} = require('./fixtures/supplier.fixtures.js');
const supplier = proxyquire('../server/controllers/supplier', {
	'../db-connection': {
		session: {
			run: dbRun
		}
	}
});
describe('Supplier - API endpoints', () => {
	describe('create', () => {
		let req;
		let res;
		beforeEach('set up stubs', () => {
			req = {
				body: {
					node: {
						id: 'sup123',
						name: 'WE Ltd'
					},
					contracts: [
						{
							name: 'IT Equipment',
							id: 'con123',
							ct: 'CT-123',
							caId: 'ca123',
							caName: 'CA-123',
							drId: 'dr123',
							drName: 'DR-123',
							dt: [{ name: 'as', id: 'as' }]
						}
					]
				}
			};
			res = {
				status: stub().returns({ send, end })
			};
		});
		afterEach('reset stubs', () => {
			res.status.reset();
			send.reset();
			end.reset();
			dbRun.reset();
		});
		it('should create all nodes', async () => {
			dbRun.onFirstCall().resolves('success');
			dbRun.resolves({ records: [] });
			await supplier.create(req, res);
			expect(res.status).to.be.calledWith(200);
			expect(send).to.be.calledWith('success');
		});
		it('should clone supplier diligence', async () => {
			dbRun
				.onCall(0)
				.resolves('successfully created supplier, contracts and submissions');
			dbRun.onCall(4).resolves({ records: emptySubmissions });
			dbRun.onCall(5).resolves({ records: submissionsToCloneFrom });
			dbRun.onCall(6).resolves('successfully cloned submission answers');
			dbRun.resolves({ records: [] });
			await supplier.create(req, res);
			expect(res.status).to.be.calledWith(200);
			expect(send).to.be.calledWith(
				'successfully created supplier, contracts and submissions'
			);
		});
	});
});

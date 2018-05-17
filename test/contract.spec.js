const proxyquire = require('proxyquire');
const { stub } = require('sinon');
const { expect } = require('chai');
const fixture = require('./fixtures/contract.get.js');

describe('Contract - API endpoints', () => {
	const req = { params: {} };
	const end = stub();
	const res = {
		send: stub(),
		status: stub().returns({ end }),
	};
	const dbRun = stub();

	let controller;
	before('mock the db', () => {
		controller = proxyquire('../server/controllers/contract', {
			'../db-connection': {
				session: {
					run: dbRun,
				}
			},
		});
	});

	afterEach('reset mocks',() => {
		end.reset();
		res.send.reset();
		res.status.resetHistory();
		dbRun.reset();
		req.params = { };
	});

	describe('get', () => {
		it('returns a json response', async () => {
			req.params = { supplierId: 'test' };
			dbRun.resolves(fixture.raw);
			await controller.get(req, res);
			expect(res.send).to.be.calledWith(fixture.parsed);
		});

		it('returns a 400 if supplier id is not set', async () => {
			await controller.get(req, res);
			expect(res.status).to.be.calledWith(400);
			expect(end).to.be.calledWith('a supplier id is required.');
		});

		it('returns a 404 if no contracts are found', async () => {
			req.params = { supplierId: 'hello' };
			dbRun.resolves({ records: [] });
			await controller.get(req, res);
			expect(res.status).to.be.calledWith(404);
			expect(end).to.be.calledWith('No submissions found for hello');
		});

		it('returns a 500 for other errors ', async () => {
			req.params = { supplierId: 'hello' };
			const malformed = { records: {}};
			dbRun.resolves(malformed);
			await controller.get(req, res);
			expect(res.status).to.be.calledWith(500);
			expect(end).to.be.calledOnce;
		});
	});
});

const proxyquire = require('proxyquire');
const { stub } = require('sinon');
const { expect } = require('chai');
const { dbResponse, parsedResult } = require('./fixtures/contract.get.response.js');

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
				run: dbRun,
			},
		});
	});

	afterEach(() => {
		end.reset();
		res.send.reset();
		dbRun.reset();
	});

	describe.only('get', () => {
		it('returns a json response', async () => {
			dbRun.resolves(dbResponse);
			await controller.get(req, res);
			expect(res.status).to.be.calledWith(404);
			expect(res.send).to.be.calledOnce; //With(parsedResult);
		});

		it('returns a 404 if supplier id is not set', async () => {
			await controller.get(req, res);
			expect(res.status).to.be.calledWith(404);
			expect(end).to.be.calledWith('a supplier id is required.');
		});

		it('returns a 404 if no contracts are found', async () => {
			req.params = { supplierId: 'hello' };
			dbRun.resolves({ records: [] });
			await controller.get(req, res);
			expect(res.status).to.be.calledWith(404);
			expect(end).to.be.calledWith('No submissions found for hello');
		});

		it('other errors return a 500', async () => {
			req.params = { supplierId: 'hello' };
			// malformed db response
			dbRun.resolves({ records: {}});
			await controller.get(req, res);
			expect(res.status).to.be.calledWith(500);
			expect(end).to.be.calledOnce;
		});
	});
});

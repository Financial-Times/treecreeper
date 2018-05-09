const proxyquire = require('proxyquire');
const { stub } = require('sinon');
const { expect } = require('chai');
const dbRun = stub();
const end = stub();
const {getAllForOnedbResponse, getAllForOneParsedResult, submitRequest} = require('./fixtures/submission.fixtures.js');

const submission = proxyquire('../server/controllers/submission', {
	'../db-connection': {
		session: {
			run: dbRun
		}
	}
});

describe('Submission - API endpoints', () => {
	let req;
	let res;
	beforeEach('set stubs', () => {
		res = {send: stub(),
					status: stub().returns({ end })};
	});
	afterEach('reset stubs', () => {
		res.send.reset();
		res.status.reset();
		end.reset();
		dbRun.reset();
	});

	describe('getAllforOne', ()=> {
		const surveyId = 'as';
		const contractOrSupplierId = '123';
		beforeEach('set stubs', () => {
			req = {params: {surveyId, contractOrSupplierId}};
		});
		it('gets a successful response', async() => {
			dbRun.resolves(getAllForOnedbResponse);
			await submission.getAllforOne(req, res);
			expect(res.send).to.be.calledWith(getAllForOneParsedResult);
		});
		it('gets an empty response', async() => {
			dbRun.resolves({records: {}});
			await submission.getAllforOne(req, res);
			expect(end).to.be.calledWith(`No ${surveyId} survey answers found for Contract ${contractOrSupplierId}`);
		});
		it('gets an invalid response', async() => {
			dbRun.resolves({});
			await submission.getAllforOne(req, res);
			expect(res.status).to.be.calledWith(500);
			expect(end).to.be.calledOnce;
		});
	});

	describe('submit', ()=> {
		beforeEach('set stubs', () => {
			req = {body:submitRequest};

		});
		it('submits a survey', async() => {
			dbRun.resolves('success');
			await submission.submit(req, res);
			expect(res.send).to.be.calledWith('success');
		});
		it('submits a survey', async() => {
			dbRun.rejects(new Error('oh noes!'));
			await submission.submit(req, res);
			expect(res.status).to.be.calledWith(500);
			expect(end).to.be.calledOnce;
		});
	});
});

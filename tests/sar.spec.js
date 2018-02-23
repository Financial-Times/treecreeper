const proxyquire = require('proxyquire');
const request = require('supertest');
const { stub } = require('sinon');
const { expect } = require('chai');

const app = require('../server/app');

const dbRunStub = stub();
const { getWithSources } = proxyquire('../server/controllers/sar', {
	'../db-connection': {
		run: dbRunStub,
	},
});

const sar = { id: 'customerEmail@test.com_1519207670717' };
const sources = [{
	id: 'livefyre_customerEmail@test.com_1519207670717',
	name: 'livefyre',
	status: 'pending'
}];

const deleteSource = async () => request(app)
		.delete('/api/Source/id/livefyre_customerEmail@test.com_1519207670717')
		.set('API_KEY', `${process.env.API_KEY}`)
		.send({ mode: 'detach' });

const deleteSar = async () => request(app)
		.delete('/api/SAR/id/customerEmail@test.com_1519207670717')
		.set('API_KEY', `${process.env.API_KEY}`)
		.send({ mode: 'detach' });

describe('SAR', () => {
	describe('POST', () => {

		after(() =>
		deleteSar()
		.then(() =>
		deleteSource()));

	it('has status code 200', (done) => {
		request(app)
		.post('/api/sar')
		.set('API_KEY', `${process.env.API_KEY}`)
		.send({ sar, sources })
		.expect(200, done);
	});
});

describe('getWithSources', () => {
	it('should return sar object with sources array', async () => {
		const sendMock = stub();
		const reqId = 'someId';
		const res = {
			send: sendMock,
		};
		const req = {
			params: {
				id: reqId,
			},
		};

		const sarProperties = {
			a: 'a',
			b: 'b',
			c: 'c',
		};

		const sourcesProperties = [
			{
				x: 'x',
				y: 'y',
				z: 'z',
			},
			{
				yes: 'yes',
				no: 'no',
				maybe: 'maybe',
			},
		];

		dbRunStub
		.withArgs(`MATCH (sar { id: "${reqId}" }) RETURN sar`)
		.resolves({
			records: [
				{
					_fields: [
						{
							properties: sarProperties,
						},
					],
				},
			],
		});

		dbRunStub
		.withArgs(`MATCH ({ id: "${reqId}" })-[:CONSUMES]->(sources) RETURN sources`)
		.resolves({
			records: [
				{
					_fields: [
						{
							properties: sourcesProperties[0],
						},
					],
				},
				{
					_fields: [
						{
							properties: sourcesProperties[1],
						},
					],
				},
			],
		});

		const expected = Object.assign({}, sarProperties, {
			sources: sourcesProperties,
		});

		await getWithSources(req, res);

		expect(sendMock.calledWith(JSON.stringify(expected))).to.be.true;
	});
});
});

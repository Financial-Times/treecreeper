const proxyquire = require('proxyquire');
const request = require('./helpers/supertest');
const { stub } = require('sinon');
const { expect } = require('chai');

const app = require('../server/app');

const dbRunStub = stub();
const { get, getWithSources } = proxyquire('../server/controllers/request', {
	'../db-connection': {
		session: {
			run: dbRunStub,
		}
	},
});

const data = { id: 'customerEmail@test.com_1519207670717' };
const sources = [{
	id: 'livefyre_customerEmail@test.com_1519207670717',
	name: 'livefyre',
	status: 'PENDING',
}];
const type = 'Sar';

const deleteSource = async () => request(app)
	.delete('/api/Source/id/livefyre_customerEmail@test.com_1519207670717')
	.set('API_KEY', `${process.env.API_KEY}`)
	.send({ mode: 'detach' });

const deleterequest = async () => request(app)
	.delete('/api/Sar/id/customerEmail@test.com_1519207670717')
	.set('API_KEY', `${process.env.API_KEY}`)
	.send({ mode: 'detach' });

describe('REQUESTS- SAR', () => {
	describe('POST', () => {

		after(async() => {
			await deleterequest()
			await deleteSource()
		})

		it('has status code 200', (done) => {
			request(app)
				.post('/api/request')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({ data, sources, type })
				.expect(200, done);
		});
	});

	describe('get', () => {
		it('should return requests array with sources summary on each item', async () => {
			const sendMock = stub();
			const res = {
				send: sendMock,
				status: stub(),
			};

			const requests = [
				{
					id: 'a',
					some: 'value',
				},
				{
					id: 'b',
					some: 'other',
				},
				{
					id: 'c',
					some: 'stuff',
				},
			];

			const sources = {
				a: [
					{
						properties: {
							status: 'COMPLETE',
						},
					},
					{
						properties: {
							status: 'PENDING',
						},
					},
					{
						properties: {
							status: 'COMPLETE',
						},
					},
				],
				b: [
					{
						properties: {
							status: 'COMPLETE',
						},
					},
					{
						properties: {
							status: 'COMPLETE',
						},
					},
				],
				c: [
					{
						properties: {
							status: 'COMPLETE',
						},
					},
				],
				d: [
					{
						properties: {
							status: 'EMPTY',
						},
					},
					{
						properties: {
							status: 'EMPTY',
						},
					},
				],
			};

			dbRunStub
				.resolves({
					records: requests.reduce((acc, request) => [
						...acc,
						{
							_fields: [
								Object.assign(
									{},
									request,
									{
										sources: sources[request.id],
									}
								),
							],
						},
					], []),
				});

			const expected = requests.reduce((acc, request) => [
				...acc,
				Object.assign(
					{},
					request,
					{
						sources: {
							complete: sources[request.id].reduce((acc, { properties: { status } }) =>
								status === 'COMPLETE'
									? acc + 1
									: acc
								, 0),
							total: sources[request.id].length,
							allEmpty: sources[request.id].every(({ properties: { status } }) => status === 'EMPTY'),
						},
					},
				),
			], []);

			await get({}, res);

			expect(sendMock.calledWith(JSON.stringify(expected))).to.be.true;
		});
	});

	describe('getWithSources', () => {
		describe('if the request id exists', () => {
			after(() =>
				deleterequest()
					.then(() => deleteSource()));

			it('status code should equal 200', (done) => {
				request(app)
					.post('/api/request')
					.set('API_KEY', `${process.env.API_KEY}`)
					.send({ data, sources, type })
					.expect(200, done);
			});
		});

		describe('if the request id is invalid', () => {
			it('status code should equal 404', (done) => {
				const invalidId = 'invalidId@test.com_1519207670717';
				const expectedMessage = `SAR or Erasure request ${invalidId} does not exist`;
				request(app)
					.get('/api/request/invalidId@test.com_1519207670717')
					.set('API_KEY', `${process.env.API_KEY}`)
					.expect(404, expectedMessage, done);
			});
		});

		it('should return request object with sources array', async () => {
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

			const requestProperties = {
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
				.resolves({
					records: [
						{
							_fields: [
								{
									request: {
										properties: requestProperties,
									},
									sources: [
										{
											properties: sourcesProperties[0],
										},
										{
											properties: sourcesProperties[1],
										},
									],
								},
							],
						},
					],
				});

			const expected = Object.assign(
				{},
				requestProperties,
				{
					sources: sourcesProperties,
				}
			);

			await getWithSources(req, res);

			expect(sendMock.calledWith(JSON.stringify(expected))).to.be.true;
		});
	});
});

const proxyquire = require('proxyquire');
const request = require('supertest');
const { stub } = require('sinon');
const { expect } = require('chai');

const app = require('../server/app');

const dbRunStub = stub();
const { get, getWithSources } = proxyquire('../server/controllers/request', {
	'../db-connection': {
		run: dbRunStub,
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

const deleteSar = async () => request(app)
	.delete('/api/Sar/id/customerEmail@test.com_1519207670717')
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
				.post('/api/request')
				.set('API_KEY', `${process.env.API_KEY}`)
				.send({ data, sources, type })
				.expect(200, done);
		});
	});

	describe('get', () => {
		it('should return sars array with sources summary on each item', async () => {
			const sendMock = stub();
			const res = {
				send: sendMock,
				status: stub(),
			};

			const sars = [
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
					records: sars.reduce((acc, sar) => [
						...acc,
						{
							_fields: [
								Object.assign(
									{},
									sar,
									{
										sources: sources[sar.id],
									}
								),
							],
						},
					], []),
				});

			const expected = sars.reduce((acc, sar) => [
				...acc,
				Object.assign(
					{},
					sar,
					{
						sources: {
							complete: sources[sar.id].reduce((acc, { properties: { status } }) =>
								status === 'COMPLETE'
									? acc + 1
									: acc
								, 0),
							total: sources[sar.id].length,
							allEmpty: sources[sar.id].every(({ properties: { status } }) => status === 'EMPTY'),
						},
					},
				),
			], []);

			await get({}, res);

			expect(sendMock.calledWith(JSON.stringify(expected))).to.be.true;
		});
	});

	describe('getWithSources', () => {
		describe('if the SAR id exists', () => {
			after(() =>
				deleteSar()
					.then(() => deleteSource()));

			it('status code should equal 200', (done) => {
				request(app)
					.post('/api/request')
					.set('API_KEY', `${process.env.API_KEY}`)
					.send({ data, sources, type })
					.expect(200, done);
			});
		});

		describe('if the SAR id is invalid', () => {
			it('status code should equal 404', (done) => {
				const invalidId = 'invalidId@test.com_1519207670717';
				const expectedMessage = `SAR ${invalidId} does not exist`;
				request(app)
					.get('/api/request/invalidId@test.com_1519207670717')
					.set('API_KEY', `${process.env.API_KEY}`)
					.expect(404, expectedMessage, done);
			});
		});

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
				.resolves({
					records: [
						{
							_fields: [
								{
									sar: {
										properties: sarProperties,
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
				sarProperties,
				{
					sources: sourcesProperties,
				}
			);

			await getWithSources(req, res);

			expect(sendMock.calledWith(JSON.stringify(expected))).to.be.true;
		});
	});
});

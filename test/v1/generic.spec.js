const { expect } = require('chai');
const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { session: db } = require('../../server/db-connection');
const API_KEY = process.env.API_KEY;
const { setupMocks } = require('./helpers');

describe('v1 - generic', () => {
	const state = {};

	setupMocks(state);

	describe('unimplemented', () => {
		describe('PUT', () => {
			it('405 Method Not Allowed', () => {
				return request(app)
					.put('/v1/node/System/test-system')
					.auth()
					.send({ foo: 'bar' })
					.expect(405);
			});
		});
	});
	describe('auth', () => {
		describe('api key', () => {
			it('GET no api_key returns 401', async () => {
				return request(app)
					.get('/v1/node/System/test-system')
					.set('client-id', 'test-client-id')
					.expect(401);
			});

			it('POST no api_key returns 401', async () => {
				await request(app)
					.post('/v1/node/System/new-system')
					.send({ foo: 'bar' })
					.set('client-id', 'test-client-id')
					.expect(401);
				const result = await db.run(
					`MATCH (n:System { id: "new-system" })-[r]-(c) RETURN n, r, c`
				);
				expect(result.records.length).to.equal(0);
			});

			it('PATCH no api_key returns 401', async () => {
				await request(app)
					.patch('/v1/node/System/a-system')
					.send({ foo: 'bar' })
					.set('client-id', 'test-client-id')
					.expect(401);
				const result = await db.run(
					`MATCH (n:System { id: "a-system" })-[r]-(c) RETURN n, r, c`
				);
				expect(result.records.length).to.equal(0);
			});

			it('DELETE no api_key returns 401', async () => {
				await request(app)
					.delete('/v1/node/System/test-system')
					.set('client-id', 'test-client-id')
					.expect(401);
				const result = await db.run(
					`MATCH (n:System { id: "test-system" })-[r]-(c) WHERE n.isDeleted = true RETURN n, r, c`
				);
				expect(result.records.length).to.equal(0);
			});
		});

		describe('client id', () => {
			it('GET no client-id returns 400', async () => {
				return request(app)
					.get('/v1/node/System/test-system')
					.set('API_KEY', API_KEY)
					.expect(400);
			});

			it('POST no client-id returns 400', async () => {
				await request(app)
					.post('/v1/node/System/new-system')
					.send({ foo: 'bar' })
					.set('API_KEY', API_KEY)
					.expect(400);
				const result = await db.run(
					`MATCH (n:System { id: "new-system" })-[r]-(c) RETURN n, r, c`
				);
				expect(result.records.length).to.equal(0);
			});

			it('PATCH no client-id returns 400', async () => {
				await request(app)
					.patch('/v1/node/System/a-system')
					.send({ foo: 'bar' })
					.set('API_KEY', API_KEY)
					.expect(400);
				const result = await db.run(
					`MATCH (n:System { id: "a-system" })-[r]-(c) RETURN n, r, c`
				);
				expect(result.records.length).to.equal(0);
			});

			it('DELETE no client-id returns 400', async () => {
				await request(app)
					.delete('/v1/node/System/test-system')
					.set('API_KEY', API_KEY)
					.expect(400);
				const result = await db.run(
					`MATCH (n:System { id: "test-system" })-[r]-(c) WHERE n.isDeleted = true RETURN n, r, c`
				);
				expect(result.records.length).to.equal(0);
			});
		});
	});
});

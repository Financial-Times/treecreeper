const { expect } = require('chai');
const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { safeQuery } = require('../../server/db-connection');
const API_KEY = process.env.API_KEY;
const { setupMocks } = require('./helpers');

describe('v1 - node generic', () => {
	const state = {};

	setupMocks(state);

	describe('unimplemented', () => {
		describe('PUT', () => {
			it('405 Method Not Allowed', () => {
				return request(app)
					.put('/v1/node/Team/test-team')
					.auth()
					.send({ foo: 'bar' })
					.expect(405);
			});
		});
	});
	describe('api key auth', () => {
		it('GET no api_key returns 401', async () => {
			return request(app)
				.get('/v1/node/Team/test-team')
				.set('client-id', 'test-client-id')
				.expect(401);
		});

		it('POST no api_key returns 401', async () => {
			await request(app)
				.post('/v1/node/Team/new-team')
				.send({ foo: 'bar' })
				.set('client-id', 'test-client-id')
				.expect(401);
			const result = await safeQuery(
				`MATCH (n:Team { code: "new-team" })-[r]-(c) RETURN n, r, c`
			);
			expect(result.records.length).to.equal(0);
		});

		it('PATCH no api_key returns 401', async () => {
			await request(app)
				.patch('/v1/node/Team/a-team')
				.send({ foo: 'bar' })
				.set('client-id', 'test-client-id')
				.expect(401);
			const result = await safeQuery(
				`MATCH (n:Team { code: "a-team" })-[r]-(c) RETURN n, r, c`
			);
			expect(result.records.length).to.equal(0);
		});

		it('DELETE no api_key returns 401', async () => {
			await request(app)
				.delete('/v1/node/Team/test-team')
				.set('client-id', 'test-client-id')
				.expect(401);
			const result = await safeQuery(
				`MATCH (n:Team { code: "test-team" })-[r]-(c) RETURN n, r, c`
			);
			expect(result.records.length).to.equal(0);
		});

		describe('client id', () => {
			it('GET no client-id returns 400', async () => {
				return request(app)
					.get('/v1/node/Team/test-team')
					.set('API_KEY', API_KEY)
					.expect(400);
			});

			it('POST no client-id returns 400', async () => {
				await request(app)
					.post('/v1/node/Team/new-team')
					.send({ foo: 'bar' })
					.set('API_KEY', API_KEY)
					.expect(400);
				const result = await safeQuery(
					`MATCH (n:Team { code: "new-team" })-[r]-(c) RETURN n, r, c`
				);
				expect(result.records.length).to.equal(0);
			});

			it('PATCH no client-id returns 400', async () => {
				await request(app)
					.patch('/v1/node/Team/a-team')
					.send({ foo: 'bar' })
					.set('API_KEY', API_KEY)
					.expect(400);
				const result = await safeQuery(
					`MATCH (n:Team { code: "a-team" })-[r]-(c) RETURN n, r, c`
				);
				expect(result.records.length).to.equal(0);
			});

			it('DELETE no client-id returns 400', async () => {
				await request(app)
					.delete('/v1/node/Team/test-team')
					.set('API_KEY', API_KEY)
					.expect(400);
				const result = await safeQuery(
					`MATCH (n:Team { code: "test-team" })-[r]-(c) RETURN n, r, c`
				);
				expect(result.records.length).to.equal(0);
			});
		});
	});

	[['post', true], ['patch', true], ['get', false], ['delete', false]].forEach(
		([method, checkBody]) => {
			describe(`security checks - ${method}`, () => {
				it('should error when node type is suspicious', async () => {
					await request(app)
						[method]('/v1/node/DROP ALL/test-team')
						.auth()
						.set('x-request-id', 'security-request-id')
						.expect(400, /Invalid node type `DROP ALL`/);
				});

				it('should error when node code is suspicious', async () => {
					await request(app)
						[method]('/v1/node/Team/DROP ALL')
						.auth()
						.set('x-request-id', 'security-request-id')
						.expect(400, /Invalid node identifier `DROP ALL`/);
				});

				it('should error when client id is suspicious', async () => {
					await request(app)
						[method]('/v1/node/Team/test-team')
						.auth()
						.set('x-client-id', 'DROP ALL')
						.expect(400, /Invalid client id `DROP ALL`/);
				});

				it('should error when request id is suspicious', async () => {
					await request(app)
						[method]('/v1/node/Team/test-team')
						.auth()
						.set('x-request-id', 'DROP ALL')
						.expect(400, /Invalid request id `DROP ALL`/);
				});

				if (checkBody) {
					describe('values in body', () => {
						// only needed for the first test below, but putting it in a before/after
						// is a more robust cleanup than doing in the test body
						const cleanUp = () =>
							safeQuery('MATCH (s:Team {code: "security-team"}) DELETE s');
						before(cleanUp);
						after(cleanUp);

						it('should save injected cypher statements in attributes as strings', async () => {
							await request(app)
								[method]('/v1/node/Team/security-team')
								.auth()
								.set('x-request-id', 'security-request-id')
								.send({
									node: {
										prop: 'MATCH (n) DELETE n'
									}
								})
								.expect(({ status }) => /20(0|1)/.test(String(status)));

							const result = await safeQuery(
								'MATCH (s:Team {code: "security-team"}) RETURN s'
							);
							expect(result.records[0].get('s').properties.prop).to.equal(
								'MATCH (n) DELETE n'
							);
						});

						it('should error when attribute name is suspicious', async () => {
							await request(app)
								[method]('/v1/node/Team/security-team')
								.auth()
								.set('x-request-id', 'security-request-id')
								.send({
									node: {
										'MATCH (n) DELETE n': 'value'
									}
								})
								.expect(400);
						});

						it.skip('TODO: write a test that is a better test of cypher injection', () => {});

						it('should error when relationship node type is suspicious', async () => {
							await request(app)
								[method]('/v1/node/Team/test-team')
								.auth()
								.set('x-request-id', 'security-request-id')
								.send({
									relationships: {
										HAS_TECH_LEAD: [
											{
												direction: 'outgoing',
												nodeType: 'DROP ALL',
												nodeCode: 'test-person'
											}
										]
									}
								})
								.expect(400, /Invalid node type `DROP ALL`/);
						});

						it('should error when relationship node code is suspicious', async () => {
							await request(app)
								[method]('/v1/node/Team/test-team')
								.auth()
								.set('x-request-id', 'security-request-id')
								.send({
									relationships: {
										HAS_TECH_LEAD: [
											{
												direction: 'outgoing',
												nodeType: 'Person',
												nodeCode: 'DROP ALL'
											}
										]
									}
								})
								.expect(400, /Invalid node identifier `DROP ALL`/);
						});

						it('should error when relationship type is suspicious', async () => {
							await request(app)
								[method]('/v1/node/Team/test-team')
								.auth()
								.set('x-request-id', 'security-request-id')
								.send({
									relationships: {
										'DROP ALL': [
											{
												direction: 'outgoing',
												nodeType: 'Person',
												nodeCode: 'test-person'
											}
										]
									}
								})
								.expect(400, /DROP ALL is not a valid relationship on Team/);
						});
					});
				}
			});
		}
	);
});

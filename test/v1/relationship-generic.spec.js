const { expect } = require('chai');
const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { executeQuery } = require('../../server/data/db-connection');
const API_KEY = process.env.API_KEY;
const { setupMocks } = require('./helpers');

describe('v1 - relationship generic', () => {
	const state = {};

	setupMocks(state);

	const cleanUp = async () => {
		await executeQuery(
			`MATCH (node:System { code: 'test-system' }) DETACH DELETE node`
		);
	};

	before(async () => {
		await cleanUp();
	});

	beforeEach(async () => {
		await executeQuery(`
			CREATE (node:System { code: 'test-system' }) RETURN node
		`);
	});

	afterEach(async () => {
		await cleanUp();
	});

	describe('unimplemented', () => {
		describe('PUT', () => {
			it('405 Method Not Allowed', () => {
				return request(app)
					.put(
						'/v1/relationship/System/test-system/SUPPORTED_BY/Team/test-team'
					)
					.auth()
					.send({ foo: 'bar' })
					.expect(405);
			});
		});
	});
	describe('api key auth', () => {
		it('GET no api_key returns 401', async () => {
			return request(app)
				.get('/v1/relationship/System/test-system/SUPPORTED_BY/Team/test-team')
				.set('client-id', 'test-client-id')
				.expect(401);
		});

		it('POST no api_key returns 401', async () => {
			await request(app)
				.post('/v1/relationship/System/test-system/SUPPORTED_BY/Team/test-team')
				.send({ foo: 'bar' })
				.set('client-id', 'test-client-id')
				.expect(401);
			const result = await executeQuery(
				`MATCH (n:System { code: "new-team" })-[r]-(c) RETURN n, r, c`
			);
			expect(result.records.length).to.equal(0);
		});

		it('PATCH no api_key returns 401', async () => {
			await request(app)
				.patch(
					'/v1/relationship/System/test-system/SUPPORTED_BY/Team/test-team'
				)
				.send({ foo: 'bar' })
				.set('client-id', 'test-client-id')
				.expect(401);
			const result = await executeQuery(
				`MATCH (n:System { code: "a-team" })-[r]-(c) RETURN n, r, c`
			);
			expect(result.records.length).to.equal(0);
		});

		it('DELETE no api_key returns 401', async () => {
			await request(app)
				.delete(
					'/v1/relationship/System/test-system/SUPPORTED_BY/Team/test-team'
				)
				.set('client-id', 'test-client-id')
				.expect(401);
			const result = await executeQuery(
				`MATCH (n:System { code: "test-system" })-[r]-(c) RETURN n, r, c`
			);
			expect(result.records.length).to.equal(0);
		});

		describe('client code', () => {
			it('GET no client-id returns 400', async () => {
				return request(app)
					.get(
						'/v1/relationship/System/test-system/SUPPORTED_BY/Team/test-team'
					)
					.set('API_KEY', API_KEY)
					.expect(400);
			});

			it('POST no client-id returns 400', async () => {
				await request(app)
					.post(
						'/v1/relationship/System/test-system/SUPPORTED_BY/Team/test-team'
					)
					.send({ foo: 'bar' })
					.set('API_KEY', API_KEY)
					.expect(400);
				const result = await executeQuery(
					`MATCH (n:System { code: "new-team" })-[r]-(c) RETURN n, r, c`
				);
				expect(result.records.length).to.equal(0);
			});

			it('PATCH no client-id returns 400', async () => {
				await request(app)
					.patch(
						'/v1/relationship/System/test-system/SUPPORTED_BY/Team/test-team'
					)
					.send({ foo: 'bar' })
					.set('API_KEY', API_KEY)
					.expect(400);
				const result = await executeQuery(
					`MATCH (n:System { code: "a-team" })-[r]-(c) RETURN n, r, c`
				);
				expect(result.records.length).to.equal(0);
			});

			it('DELETE no client-id returns 400', async () => {
				await request(app)
					.delete(
						'/v1/relationship/System/test-system/SUPPORTED_BY/Team/test-team'
					)
					.set('API_KEY', API_KEY)
					.expect(400);

				const result = await executeQuery(
					`MATCH (n:System { code: "test-system" })-[r]-(c) RETURN n, r, c`
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
						[method](
							'/v1/relationship/DROP ALL/test-system/SUPPORTED_BY/Team/test-team'
						)
						.auth()
						.set('x-request-id', 'security-request-id')
						.expect(400, /Invalid node type `DROP ALL`/);
				});

				it('should error when node code is suspicious', async () => {
					await request(app)
						[method](
							'/v1/relationship/System/DROP ALL/SUPPORTED_BY/Team/test-team'
						)
						.auth()
						.set('x-request-id', 'security-request-id')
						.expect(400, /Invalid node identifier `DROP ALL`/);
				});

				it('should error when relationship type is suspicious', async () => {
					await request(app)
						[method](
							'/v1/relationship/System/test-system/DROP ALL/Team/test-team'
						)
						.auth()
						.set('x-request-id', 'security-request-id')
						.expect(400, /DROP ALL is not a valid relationship on System/);
				});

				it('should error when related node type is suspicious', async () => {
					await request(app)
						[method](
							'/v1/relationship/System/test-system/SUPPORTED_BY/DROP ALL/test-team'
						)
						.auth()
						.set('x-request-id', 'security-request-id')
						// not testing error message as biz-ops-schema has been changed to be v2 api first
						// which makes precise validation of some error types tricky
						// but it 400s - that's the main thing
						.expect(400);
				});

				it('should error when related node code is suspicious', async () => {
					await request(app)
						[method](
							'/v1/relationship/System/test-system/SUPPORTED_BY/Team/DROP ALL'
						)
						.auth()
						.set('x-request-id', 'security-request-id')
						.expect(400, /Invalid node identifier `DROP ALL`/);
				});

				it('should error when client id is suspicious', async () => {
					await request(app)
						[method](
							'/v1/relationship/System/test-system/SUPPORTED_BY/Team/test-team'
						)
						.auth()
						.set('client-id', 'DROP ALL')
						.expect(400, /Invalid client id `DROP ALL`/);
				});

				it('should error when request id is suspicious', async () => {
					await request(app)
						[method](
							'/v1/relationship/System/test-system/SUPPORTED_BY/Team/test-team'
						)
						.auth()
						.set('x-request-id', 'DROP ALL')
						.expect(400, /Invalid request id `DROP ALL`/);
				});

				if (checkBody) {
					describe('values in body', () => {
						// only needed for the first test below, but putting it in a before/after
						// is a more robust cleanup than doing in the test body
						const cleanUp = () =>
							executeQuery('MATCH (s:System {code: "security-team"}) DELETE s');
						before(cleanUp);
						after(cleanUp);

						it('should save injected cypher statements in attributes as strings', async () => {
							await request(app)
								[method](
									'/v1/relationship/System/test-system/SUPPORTED_BY/Team/test-team'
								)
								.auth()
								.set('x-request-id', 'security-request-id')
								.send({
									prop: 'MATCH (n) DELETE n'
								})
								.expect(({ status }) => /20(0|1)/.test(String(status)));

							const result = await executeQuery(
								'MATCH (s:System {code: "test-system"})-[r:SUPPORTED_BY]->(p:Team {code: "test-team"}) RETURN s, r, p'
							);
							expect(result.records[0].get('r').properties.prop).to.equal(
								'MATCH (n) DELETE n'
							);
						});

						it('should error when attribute name is suspicious', async () => {
							await request(app)
								[method](
									'/v1/relationship/System/test-system/SUPPORTED_BY/Team/test-team'
								)
								.auth()
								.set('x-request-id', 'security-request-id')
								.send({
									'MATCH (n) DELETE n': 'value'
								})
								.expect(400);
						});

						it.skip('TODO: write a test that is a better test of cypher injection', () => {});
					});
				}
			});
		}
	);
});

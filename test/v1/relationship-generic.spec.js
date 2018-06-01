const { expect } = require('chai');
const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { session: db } = require('../../server/db-connection');
const API_KEY = process.env.API_KEY;
const { setupMocks } = require('./helpers');

describe('v1 - relationship generic', () => {
	const state = {};

	setupMocks(state);

	describe('unimplemented', () => {
		describe('PUT', () => {
			it('405 Method Not Allowed', () => {
				return request(app)
					.put(
						'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person'
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
				.get(
					'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person'
				)
				.set('client-id', 'test-client-id')
				.expect(401);
		});

		it('POST no api_key returns 401', async () => {
			await request(app)
				.post(
					'/v1/relationship/System/test-system/HAS_TEAM_MEMBER/Person/test-person'
				)
				.send({ foo: 'bar' })
				.set('client-id', 'test-client-id')
				.expect(401);
			const result = await db.run(
				`MATCH (n:System { code: "new-system" })-[r]-(c) RETURN n, r, c`
			);
			expect(result.records.length).to.equal(0);
		});

		it('PATCH no api_key returns 401', async () => {
			await request(app)
				.patch(
					'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person'
				)
				.send({ foo: 'bar' })
				.set('client-id', 'test-client-id')
				.expect(401);
			const result = await db.run(
				`MATCH (n:System { code: "a-system" })-[r]-(c) RETURN n, r, c`
			);
			expect(result.records.length).to.equal(0);
		});

		it('DELETE no api_key returns 401', async () => {
			await request(app)
				.delete(
					'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person'
				)
				.set('client-id', 'test-client-id')
				.expect(401);
			const result = await db.run(
				`MATCH (n:System { code: "test-system" })-[r]-(c) WHERE n.isDeleted = true RETURN n, r, c`
			);
			expect(result.records.length).to.equal(0);
		});

		describe('client code', () => {
			it('GET no client-id returns 400', async () => {
				return request(app)
					.get(
						'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person'
					)
					.set('API_KEY', API_KEY)
					.expect(400);
			});

			it('POST no client-id returns 400', async () => {
				await request(app)
					.post(
						'/v1/relationship/System/test-system/HAS_TEAM_MEMBER/Person/test-person'
					)
					.send({ foo: 'bar' })
					.set('API_KEY', API_KEY)
					.expect(400);
				const result = await db.run(
					`MATCH (n:System { code: "new-system" })-[r]-(c) RETURN n, r, c`
				);
				expect(result.records.length).to.equal(0);
			});

			it('PATCH no client-id returns 400', async () => {
				await request(app)
					.patch(
						'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person'
					)
					.send({ foo: 'bar' })
					.set('API_KEY', API_KEY)
					.expect(400);
				const result = await db.run(
					`MATCH (n:System { code: "a-system" })-[r]-(c) RETURN n, r, c`
				);
				expect(result.records.length).to.equal(0);
			});

			it('DELETE no client-id returns 400', async () => {
				await request(app)
					.delete(
						'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person'
					)
					.set('API_KEY', API_KEY)
					.expect(400);
				const result = await db.run(
					`MATCH (n:System { code: "test-system" })-[r]-(c) WHERE n.isDeleted = true RETURN n, r, c`
				);
				expect(result.records.length).to.equal(0);
			});
		});
	});

	[['post', true], ['patch', true], ['get', false], ['delete', false]].forEach(
		([method, checkBody]) => {
			describe('security checks', () => {
				it('should error when node type is suspicious', async () => {
					await request(app)
						[method](
							'/v1/relationship/DROP ALL/test-system/HAS_TECH_LEAD/Person/test-person'
						)
						.auth()
						.set('x-request-id', 'security-request-id')
						.expect(
							400,
							'Invalid node type `DROP ALL`.\nMust be a string containing only a-z, beginning with a capital letter'
						);
				});

				it('should error when node code is suspicious', async () => {
					await request(app)
						[method](
							'/v1/relationship/System/DROP ALL/HAS_TECH_LEAD/Person/test-person'
						)
						.auth()
						.set('x-request-id', 'security-request-id')
						.expect(
							400,
							'Invalid node identifier `DROP ALL`.\nMust be a string containing only a-z, 0-9, . and -, not beginning or ending with - or .'
						);
				});

				it('should error when relationship type is suspicious', async () => {
					await request(app)
						[method](
							'/v1/relationship/System/test-system/DROP ALL/Person/test-person'
						)
						.auth()
						.set('x-request-id', 'security-request-id')
						.expect(
							400,
							'Invalid relationship `DROP ALL`.\nMust be a string containing only A-Z and _, not beginning or ending with _.'
						);
				});

				it('should error when related node type is suspicious', async () => {
					await request(app)
						[method](
							'/v1/relationship/System/test-system/HAS_TECH_LEAD/DROP ALL/test-person'
						)
						.auth()
						.set('x-request-id', 'security-request-id')
						.expect(
							400,
							'Invalid node type `DROP ALL`.\nMust be a string containing only a-z, beginning with a capital letter'
						);
				});

				it('should error when related node code is suspicious', async () => {
					await request(app)
						[method](
							'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/DROP ALL'
						)
						.auth()
						.set('x-request-id', 'security-request-id')
						.expect(
							400,
							'Invalid node identifier `DROP ALL`.\nMust be a string containing only a-z, 0-9, . and -, not beginning or ending with - or .'
						);
				});

				it('should error when request id is suspicious', async () => {
					await request(app)
						[method](
							'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person'
						)
						.auth()
						.set('x-request-id', 'DROP ALL')
						.expect(
							400,
							'Invalid request id `DROP ALL`.\nMust be a string containing only a-z, 0-9 and -, not beginning or ending with -.'
						);
				});

				if (checkBody) {
					describe('values in body', () => {
						// only needed for the first test below, but putting it in a before/after
						// is a more robust cleanup than doing in the test body
						const cleanUp = () =>
							db.run('MATCH (s:System {code: "security-system"}) DELETE s');
						before(cleanUp);
						after(cleanUp);

						it('should save injected cypher statements in attributes as strings', async () => {
							await request(app)
								[method](
									'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person'
								)
								.auth()
								.set('x-request-id', 'security-request-id')
								.send({
									prop: 'MATCH (n) DELETE n'
								})
								.expect(({ status }) => /20(0|1)/.test(String(status)));

							const result = await db.run(
								'MATCH (s:System {code: "test-system"})-[r:HAS_TECH_LEAD]->(p:Person {code: "test-person"}) RETURN s, r, p'
							);
							expect(result.records[0].get('r').properties.prop).to.equal(
								'MATCH (n) DELETE n'
							);
						});

						it('should error when attribute name is suspicious', async () => {
							await request(app)
								[method](
									'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person'
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

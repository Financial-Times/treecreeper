const app = require('../../server/app.js');
const API_KEY = process.env.API_KEY;
const { setupMocks, verifyNotExists } = require('../helpers');

describe('v2 - node generic', () => {
	const sandbox = {};
	const namespace = 'node-v2-firewall';
	const teamCode = `${namespace}-team`;
	const teamRestUrl = `/v2/node/Team/${teamCode}`;

	setupMocks(sandbox, { namespace });

	describe('unimplemented', () => {
		describe('PUT', () => {
			it('405 Method Not Allowed', () => {
				return sandbox
					.request(app)
					.put(teamRestUrl)
					.namespacedAuth()
					.expect(405);
			});
		});
	});
	describe('api key auth', () => {
		it('GET no api_key returns 401', async () => {
			return sandbox
				.request(app)
				.get(teamRestUrl)
				.set('client-id', 'test-client-id')
				.expect(401);
		});

		it('POST no api_key returns 401', async () => {
			await sandbox
				.request(app)
				.post(teamRestUrl)
				.send({ foo: 'bar' })
				.set('client-id', 'test-client-id')
				.expect(401);
			verifyNotExists('Team', teamCode);
		});

		it('PATCH no api_key returns 401', async () => {
			await sandbox
				.request(app)
				.patch('/v2/node/Team/a-team')
				.send({ foo: 'bar' })
				.set('client-id', 'test-client-id')
				.expect(401);
			verifyNotExists('Team', teamCode);
		});

		it('DELETE no api_key returns 401', async () => {
			await sandbox
				.request(app)
				.delete(teamRestUrl)
				.set('client-id', 'test-client-id')
				.expect(401);
			verifyNotExists('Team', teamCode);
		});

		describe('client id', () => {
			it('GET no client-id returns 400', async () => {
				return sandbox
					.request(app)
					.get(teamRestUrl)
					.set('API_KEY', API_KEY)
					.expect(400);
			});

			it('POST no client-id returns 400', async () => {
				await sandbox
					.request(app)
					.post('/v2/node/Team/new-team')
					.send({ foo: 'bar' })
					.set('API_KEY', API_KEY)
					.expect(400);
				verifyNotExists('Team', teamCode);
			});

			it('PATCH no client-id returns 400', async () => {
				await sandbox
					.request(app)
					.patch('/v2/node/Team/a-team')
					.send({ foo: 'bar' })
					.set('API_KEY', API_KEY)
					.expect(400);
				verifyNotExists('Team', teamCode);
			});

			it('DELETE no client-id returns 400', async () => {
				await sandbox
					.request(app)
					.delete(teamRestUrl)
					.set('API_KEY', API_KEY)
					.expect(400);
				verifyNotExists('Team', teamCode);
			});
		});
	});

	[['post', true], ['patch', true], ['get', false], ['delete', false]].forEach(
		([method, checkBody]) => {
			describe(`security checks - ${method}`, () => {
				it('should error when node type is suspicious', async () => {
					await sandbox
						.request(app)
						[method](`/v2/node/DROP ALL/${teamCode}`)
						.namespacedAuth()
						.expect(400, /Invalid node type `DROP ALL`/);
				});

				it('should error when node code is suspicious', async () => {
					await sandbox
						.request(app)
						[method]('/v2/node/Team/DROP ALL')
						.namespacedAuth()
						.expect(
							400,
							/Invalid value `DROP ALL` for property `code` on type `Team`/
						);
				});

				it('should error when client id is suspicious', async () => {
					await sandbox
						.request(app)
						[method](teamRestUrl)
						.set('API_KEY', API_KEY)
						.set('client-id', 'DROP ALL')
						.expect(400, /Invalid client id `DROP ALL`/);
				});

				it('should error when request id is suspicious', async () => {
					await sandbox
						.request(app)
						[method](teamRestUrl)
						.set('API_KEY', API_KEY)
						.set('client-id', 'valid-id')
						.set('x-request-id', 'DROP ALL')
						.expect(400, /Invalid request id `DROP ALL`/);
				});

				if (checkBody) {
					describe('values in body', () => {
						it('should save injected cypher statements in attributes as strings', async () => {
							await sandbox
								.request(app)
								[method](teamRestUrl)
								.namespacedAuth()
								.send({
									prop: 'MATCH (n) DELETE n'
								})
								.expect(({ status }) => /20(0|1)/.test(String(status)));
							verifyNotExists('Team', teamCode);
						});

						it('should error when attribute name is suspicious', async () => {
							await sandbox
								.request(app)
								[method](teamRestUrl)
								.namespacedAuth()
								.send({
									'MATCH (n) DELETE n': 'value'
								})
								.expect(400);
						});

						it.skip('TODO: write a test that is a better test of cypher injection', () => {});

						it('should error when relationship node code is suspicious', async () => {
							await sandbox
								.request(app)
								[method](teamRestUrl)
								.namespacedAuth()
								.send({
									supports: ['DROP ALL']
								})
								.expect(
									400,
									/Invalid value `DROP ALL` for property `code` on type `System`/
								);
						});
					});
				}
			});
		}
	);
});

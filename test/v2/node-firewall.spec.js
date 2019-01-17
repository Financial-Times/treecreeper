const app = require('../../server/app.js');

const { API_KEY } = process.env;
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

		describe('client headers', () => {
			it('GET no client-id or client-user-id returns 400', async () => {
				return sandbox
					.request(app)
					.get(teamRestUrl)
					.set('API_KEY', API_KEY)
					.expect(400);
			});

			it('POST no client-id or client-user-id returns 400', async () => {
				await sandbox
					.request(app)
					.post('/v2/node/Team/new-team')
					.send({ foo: 'bar' })
					.set('API_KEY', API_KEY)
					.expect(400);
				verifyNotExists('Team', teamCode);
			});

			it('PATCH no client-id or client-user-id returns 400', async () => {
				await sandbox
					.request(app)
					.patch('/v2/node/Team/a-team')
					.send({ foo: 'bar' })
					.set('API_KEY', API_KEY)
					.expect(400);
				verifyNotExists('Team', teamCode);
			});

			it('DELETE no client-id or client-user-id returns 400', async () => {
				await sandbox
					.request(app)
					.delete(teamRestUrl)
					.set('API_KEY', API_KEY)
					.expect(400);
				verifyNotExists('Team', teamCode);
			});

			it('GET client-id but no client-user-id returns 200', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1',
				});
				return sandbox
					.request(app)
					.get(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', 'test-client-id')
					.expect(200);
			});

			it('POST client-id but no client-user-id returns 200', async () => {
				return sandbox
					.request(app)
					.post(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', 'test-client-id')
					.expect(200);
			});

			it('PATCH client-id but no client-user-id returns 200', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1',
				});
				return sandbox
					.request(app)
					.patch(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', 'test-client-id')
					.send({ name: 'name2' })
					.expect(200);
			});

			it('DELETE client-id but no client-user-id returns 204', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1',
				});
				return sandbox
					.request(app)
					.delete(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', 'test-client-id')
					.expect(204);
			});

			it('GET client-user-id but no client-id returns 200', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1',
				});
				return sandbox
					.request(app)
					.get(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', 'test-user-id')
					.expect(200);
			});

			it('POST client-user-id but no client-id returns 200', async () => {
				return sandbox
					.request(app)
					.post(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', 'test-user-id')
					.expect(200);
			});

			it('PATCH client-user-id but no client-id returns 200', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1',
				});
				return sandbox
					.request(app)
					.patch(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', 'test-user-id')
					.send({ name: 'name2' })
					.expect(200);
			});

			it('DELETE client-user-id but no client-id returns 204', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1',
				});
				return sandbox
					.request(app)
					.delete(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', 'test-user-id')
					.expect(204);
			});

			it('GET client-id and client-user-id returns 200', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1',
				});
				return sandbox
					.request(app)
					.get(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', 'test-client-id')
					.set('client-user-id', 'test-user-id')
					.expect(200);
			});

			it('POST client-id and client-user-id returns 200', async () => {
				return sandbox
					.request(app)
					.post(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', 'test-user-id')
					.set('client-id', 'test-client-id')
					.expect(200);
			});

			it('PATCH client-id and client-user-id returns 200', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1',
				});
				return sandbox
					.request(app)
					.patch(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', 'test-user-id')
					.set('client-id', 'test-client-id')
					.send({ name: 'name2' })
					.expect(200);
			});

			it('DELETE client-id and client-user-id returns 204', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1',
				});
				return sandbox
					.request(app)
					.delete(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', 'test-client-id')
					.set('client-user-id', 'test-user-id')
					.expect(204);
			});
		});
	});

	[
		['post', true],
		['patch', true],
		['get', false],
		['delete', false],
	].forEach(([method, checkBody]) => {
		describe(`security checks - ${method}`, () => {
			// Example cypher query taken from https://stackoverflow.com/a/24317293/10917765
			const INJECTION_ATTACK_STRING =
				'"1 WITH count(1) AS dummy MATCH (u:User) OPTIONAL MATCH (u)-[r]-() DELETE u, r"';
			const ESCAPED_INJECTION_ATTACK_STRING =
				'\\\\"1 WITH count\\(1\\) AS dummy MATCH \\(u:User\\) OPTIONAL MATCH \\(u\\)-\\[r\\]-\\(\\) DELETE u, r\\\\"';
			it('should error when node type is suspicious', async () => {
				await sandbox
					.request(app)
					[method](`/v2/node/${INJECTION_ATTACK_STRING}/${teamCode}`)
					.namespacedAuth()
					.expect(
						400,
						new RegExp(
							`Invalid node type \`${ESCAPED_INJECTION_ATTACK_STRING}\``,
						),
					);
			});

			it('should error when node code is suspicious', async () => {
				await sandbox
					.request(app)
					[method](`/v2/node/Team/${INJECTION_ATTACK_STRING}`)
					.namespacedAuth()
					.expect(
						400,
						new RegExp(
							`Invalid value \`${ESCAPED_INJECTION_ATTACK_STRING}\` for property \`code\` on type \`Team\``,
						),
					);
			});

			it('should error when client id is suspicious', async () => {
				await sandbox
					.request(app)
					[method](teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', `${INJECTION_ATTACK_STRING}`)
					.expect(
						400,
						new RegExp(
							`Invalid client id \`${ESCAPED_INJECTION_ATTACK_STRING}\``,
						),
					);
			});

			it('should error when client user id is suspicious', async () => {
				await sandbox
					.request(app)
					[method](teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', `${INJECTION_ATTACK_STRING}`)
					.expect(
						400,
						new RegExp(
							`Invalid client user id \`${ESCAPED_INJECTION_ATTACK_STRING}\``,
						),
					);
			});

			it('should error when request id is suspicious', async () => {
				await sandbox
					.request(app)
					[method](teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', 'valid-id')
					.set('x-request-id', `${INJECTION_ATTACK_STRING}`)
					.expect(
						400,
						new RegExp(
							`Invalid request id \`${ESCAPED_INJECTION_ATTACK_STRING}\``,
						),
					);
			});

			if (checkBody) {
				describe('values in body', () => {
					it('should save injected cypher statements in attributes as strings', async () => {
						await sandbox
							.request(app)
							[method](teamRestUrl)
							.namespacedAuth()
							.send({
								prop: `${INJECTION_ATTACK_STRING}`,
							})
							.expect(({ status }) =>
								/20(0|1)/.test(String(status)),
							);
						verifyNotExists('Team', teamCode);
					});

					it('should error when attribute name is suspicious', async () => {
						await sandbox
							.request(app)
							[method](teamRestUrl)
							.namespacedAuth()
							.send({
								[`${INJECTION_ATTACK_STRING}`]: 'value',
							})
							.expect(400);
					});

					it('should error when relationship node code is suspicious', async () => {
						await sandbox
							.request(app)
							[method](teamRestUrl)
							.namespacedAuth()
							.send({
								supports: [`${INJECTION_ATTACK_STRING}`],
							})
							.expect(
								400,
								new RegExp(
									`Invalid value \`${ESCAPED_INJECTION_ATTACK_STRING}\` for property \`code\` on type \`System\``,
								),
							);
					});
				});
			}
		});
	});
});

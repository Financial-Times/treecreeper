const app = require('../../server/app.js');

const { API_KEY } = process.env;
const { setupMocks, verifyNotExists } = require('../helpers');

describe('v2 - node firewall', () => {
	const sandbox = {};
	const namespace = 'node-v2-firewall';
	const mainCode = `${namespace}-main`;
	const restUrl = `/v2/node/MainType/${mainCode}`;

	setupMocks(sandbox, { namespace });

	describe('unimplemented', () => {
		describe('PUT', () => {
			it('405 Method Not Allowed', () => {
				return sandbox
					.request(app)
					.put(restUrl)
					.namespacedAuth()
					.expect(405);
			});
		});
	});
	describe('api key auth', () => {
		it('GET no api_key returns 401', async () => {
			return sandbox
				.request(app)
				.get(restUrl)
				.set('client-id', 'test-client-id')
				.expect(401);
		});

		it('POST no api_key returns 401', async () => {
			await sandbox
				.request(app)
				.post(restUrl)
				.send({ foo: 'bar' })
				.set('client-id', 'test-client-id')
				.expect(401);
			await verifyNotExists('MainType', mainCode);
		});

		it('PATCH no api_key returns 401', async () => {
			await sandbox
				.request(app)
				.patch('/v2/node/MainType/a-team')
				.send({ foo: 'bar' })
				.set('client-id', 'test-client-id')
				.expect(401);
			await verifyNotExists('MainType', mainCode);
		});

		it('DELETE no api_key returns 401', async () => {
			await sandbox
				.request(app)
				.delete(restUrl)
				.set('client-id', 'test-client-id')
				.expect(401);
			await verifyNotExists('MainType', mainCode);
		});

		describe('client headers', () => {
			it('GET no client-id or client-user-id returns 400', async () => {
				return sandbox
					.request(app)
					.get(restUrl)
					.set('API_KEY', API_KEY)
					.expect(400);
			});

			it('POST no client-id or client-user-id returns 400', async () => {
				await sandbox
					.request(app)
					.post('/v2/node/MainType/new-team')
					.send({ foo: 'bar' })
					.set('API_KEY', API_KEY)
					.expect(400);
				await verifyNotExists('MainType', mainCode);
			});

			it('PATCH no client-id or client-user-id returns 400', async () => {
				await sandbox
					.request(app)
					.patch('/v2/node/MainType/a-team')
					.send({ foo: 'bar' })
					.set('API_KEY', API_KEY)
					.expect(400);
				await verifyNotExists('MainType', mainCode);
			});

			it('DELETE no client-id or client-user-id returns 400', async () => {
				await sandbox
					.request(app)
					.delete(restUrl)
					.set('API_KEY', API_KEY)
					.expect(400);
				await verifyNotExists('MainType', mainCode);
			});

			it('GET client-id but no client-user-id returns 200', async () => {
				await sandbox.createNode('MainType', {
					code: mainCode,
					someString: 'name1',
				});
				return sandbox
					.request(app)
					.get(restUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', 'test-client-id')
					.expect(200);
			});

			it('POST client-id but no client-user-id returns 200', async () => {
				return sandbox
					.request(app)
					.post(restUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', 'test-client-id')
					.expect(200);
			});

			it('PATCH client-id but no client-user-id returns 200', async () => {
				await sandbox.createNode('MainType', {
					code: mainCode,
					someString: 'name1',
				});
				return sandbox
					.request(app)
					.patch(restUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', 'test-client-id')
					.send({ someString: 'name2' })
					.expect(200);
			});

			it('DELETE client-id but no client-user-id returns 204', async () => {
				await sandbox.createNode('MainType', {
					code: mainCode,
					someString: 'name1',
				});
				return sandbox
					.request(app)
					.delete(restUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', 'test-client-id')
					.expect(204);
			});

			it('GET client-user-id but no client-id returns 200', async () => {
				await sandbox.createNode('MainType', {
					code: mainCode,
					someString: 'name1',
				});
				return sandbox
					.request(app)
					.get(restUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', 'test-user-id')
					.expect(200);
			});

			it('POST client-user-id but no client-id returns 200', async () => {
				return sandbox
					.request(app)
					.post(restUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', 'test-user-id')
					.expect(200);
			});

			it('PATCH client-user-id but no client-id returns 200', async () => {
				await sandbox.createNode('MainType', {
					code: mainCode,
					someString: 'name1',
				});
				return sandbox
					.request(app)
					.patch(restUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', 'test-user-id')
					.send({ someString: 'name2' })
					.expect(200);
			});

			it('DELETE client-user-id but no client-id returns 204', async () => {
				await sandbox.createNode('MainType', {
					code: mainCode,
					someString: 'name1',
				});
				return sandbox
					.request(app)
					.delete(restUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', 'test-user-id')
					.expect(204);
			});

			it('GET client-id and client-user-id returns 200', async () => {
				await sandbox.createNode('MainType', {
					code: mainCode,
					someString: 'name1',
				});
				return sandbox
					.request(app)
					.get(restUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', 'test-client-id')
					.set('client-user-id', 'test-user-id')
					.expect(200);
			});

			it('POST client-id and client-user-id returns 200', async () => {
				return sandbox
					.request(app)
					.post(restUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', 'test-user-id')
					.set('client-id', 'test-client-id')
					.expect(200);
			});

			it('PATCH client-id and client-user-id returns 200', async () => {
				await sandbox.createNode('MainType', {
					code: mainCode,
					someString: 'name1',
				});
				return sandbox
					.request(app)
					.patch(restUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', 'test-user-id')
					.set('client-id', 'test-client-id')
					.send({ someString: 'name2' })
					.expect(200);
			});

			it('DELETE client-id and client-user-id returns 204', async () => {
				await sandbox.createNode('MainType', {
					code: mainCode,
					someString: 'name1',
				});
				return sandbox
					.request(app)
					.delete(restUrl)
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
					[method](`/v2/node/${INJECTION_ATTACK_STRING}/${mainCode}`)
					.namespacedAuth()
					.expect(
						400,
						new RegExp(
							`Invalid type \`${ESCAPED_INJECTION_ATTACK_STRING}\``,
						),
					);
			});

			it('should error when node code is suspicious', async () => {
				await sandbox
					.request(app)
					[method](`/v2/node/MainType/${INJECTION_ATTACK_STRING}`)
					.namespacedAuth()
					.expect(
						400,
						new RegExp(
							`Invalid value \`${ESCAPED_INJECTION_ATTACK_STRING}\` for property \`code\` on type \`MainType\``,
						),
					);
			});

			it('should error when client id is suspicious', async () => {
				await sandbox
					.request(app)
					[method](restUrl)
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
					[method](restUrl)
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
					[method](restUrl)
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
							[method](restUrl)
							.namespacedAuth()
							.send({
								prop: `${INJECTION_ATTACK_STRING}`,
							})
							.expect(({ status }) =>
								/20(0|1)/.test(String(status)),
							);
						await verifyNotExists('MainType', mainCode);
					});

					it('should error when attribute name is suspicious', async () => {
						await sandbox
							.request(app)
							[method](restUrl)
							.namespacedAuth()
							.send({
								[`${INJECTION_ATTACK_STRING}`]: 'value',
							})
							.expect(400);
					});

					it('should error when relationship node code is suspicious', async () => {
						await sandbox
							.request(app)
							[method](restUrl)
							.namespacedAuth()
							.send({
								children: [`${INJECTION_ATTACK_STRING}`],
							})
							.expect(
								400,
								new RegExp(
									`Invalid value \`${ESCAPED_INJECTION_ATTACK_STRING}\` for property \`code\` on type \`ChildType\``,
								),
							);
					});
				});
			}
		});
	});
});

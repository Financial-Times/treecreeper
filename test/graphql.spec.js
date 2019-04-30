const sinon = require('sinon');
const app = require('../server/app.js');
const { setupMocks } = require('./helpers');

const request = require('./helpers/supertest').getNamespacedSupertest(
	'graphql',
);
const security = require('../server/middleware/security');

describe('graphql', () => {
	const sandbox = {};

	const namespace = 'graphql';
	setupMocks(sandbox, { namespace });

	const systemCode = `${namespace}-system`;

	it('Return a single system', async () => {
		await sandbox.createNode('System', {
			code: systemCode,
			name: 'name1',
			lifecycleStage: 'Production',
		});
		return sandbox
			.request(app)
			.post('/graphql')
			.send({
				query: `{
					System(code: "${systemCode}") {
						code
						name
						lifecycleStage
					}}`,
			})
			.namespacedAuth()
			.expect(200)
			.then(({ body }) => {
				expect(body).toEqual({
					data: {
						System: {
							code: systemCode,
							lifecycleStage: 'Production',
							name: 'name1',
						},
					},
				});
			});
	});

	it('Return a single system via GET request', async () => {
		await sandbox.createNode('System', {
			code: systemCode,
			name: 'name1',
			lifecycleStage: 'Production',
		});
		return sandbox
			.request(app)
			.get(
				`/graphql?query={System(code: "${systemCode}") {code name lifecycleStage}}`,
			)
			.namespacedAuth()
			.expect(200)
			.then(({ body }) => {
				expect(body).toEqual({
					data: {
						System: {
							code: systemCode,
							lifecycleStage: 'Production',
							name: 'name1',
						},
					},
				});
			});
	});

	it('Return metadata for system', async () => {
		await sandbox.createNode('System', {
			code: systemCode,
		});
		return sandbox
			.request(app)
			.post('/graphql')
			.send({
				query: `{
					System(code: "${systemCode}") {
						code
						_createdTimestamp {formatted}
						_updatedTimestamp {formatted}
						_updatedByClient
						_createdByClient
						_updatedByUser
						_createdByUser
					}}`,
			})
			.namespacedAuth()
			.expect(200)
			.then(({ body }) => {
				expect(body).toEqual({
					data: {
						System: {
							code: systemCode,
							_createdByClient: 'graphql-init-client',
							_createdByUser: 'graphql-init-user',
							_createdTimestamp: {
								formatted: '2015-11-15T08:12:27.908000000Z',
							},
							_updatedByClient: 'graphql-client',
							_updatedByUser: 'graphql-user',
							_updatedTimestamp: {
								formatted: '2019-01-09T09:08:22.908000000Z',
							},
						},
					},
				});
			});
	});

	it('Return metadata for system via GET request', async () => {
		await sandbox.createNode('System', {
			code: systemCode,
		});
		return sandbox
			.request(app)
			.get(
				`/graphql?query={
					System(code: "${systemCode}") {
						code
						_createdTimestamp {formatted}
						_updatedTimestamp {formatted}
						_updatedByClient
						_createdByClient
						_updatedByUser
						_createdByUser
					}}`,
			)
			.namespacedAuth()
			.expect(200)
			.then(({ body }) => {
				expect(body).toEqual({
					data: {
						System: {
							code: systemCode,
							_createdByClient: 'graphql-init-client',
							_createdByUser: 'graphql-init-user',
							_createdTimestamp: {
								formatted: '2015-11-15T08:12:27.908000000Z',
							},
							_updatedByClient: 'graphql-client',
							_updatedByUser: 'graphql-user',
							_updatedTimestamp: {
								formatted: '2019-01-09T09:08:22.908000000Z',
							},
						},
					},
				});
			});
	});

	it('Returns related entities', async () => {
		const teamCode = `${namespace}-team`;
		const [system, team] = await sandbox.createNodes(
			[
				'System',
				{
					code: systemCode,
				},
			],
			['Team', { code: teamCode }],
		);

		await sandbox.connectNodes(system, 'DELIVERED_BY', team);
		return sandbox
			.request(app)
			.post('/graphql')
			.send({
				query: `{
					System(code: "${systemCode}") {
						code
						deliveredBy {code}
					}}`,
			})
			.namespacedAuth()
			.expect(200)
			.then(({ body }) => {
				expect(body).toEqual({
					data: {
						System: {
							code: systemCode,
							deliveredBy: { code: teamCode },
						},
					},
				});
			});
	});

	it('Returns related entities via GET request', async () => {
		const teamCode = `${namespace}-team`;
		const [system, team] = await sandbox.createNodes(
			[
				'System',
				{
					code: systemCode,
				},
			],
			['Team', { code: teamCode }],
		);

		await sandbox.connectNodes(system, 'DELIVERED_BY', team);
		return sandbox
			.request(app)
			.get(
				`/graphql?query={System(code: "${systemCode}") {code deliveredBy {code}}}`,
			)
			.namespacedAuth()
			.expect(200)
			.then(({ body }) => {
				expect(body).toEqual({
					data: {
						System: {
							code: systemCode,
							deliveredBy: { code: teamCode },
						},
					},
				});
			});
	});

	it('Returns a list of systems', async () => {
		await sandbox.createNodes(
			[
				'System',
				{
					code: systemCode + 1,
				},
			],
			[
				'System',
				{
					code: systemCode + 2,
				},
			],
		);
		return sandbox
			.request(app)
			.post('/graphql')
			.send({
				query: `{
					Systems {
						code
					}}`,
			})
			.namespacedAuth()
			.expect(200)
			.then(({ body }) => {
				[1, 2].forEach(num => {
					const result = body.data.Systems.find(
						s => s.code === systemCode + num,
					);
					expect(result).not.toBeUndefined();
					expect(result).toEqual({ code: systemCode + num });
				});
			});
	});

	it('Returns a list of systems via GET request', async () => {
		await sandbox.createNodes(
			[
				'System',
				{
					code: systemCode + 1,
				},
			],
			[
				'System',
				{
					code: systemCode + 2,
				},
			],
		);
		return sandbox
			.request(app)
			.get(`/graphql?query={Systems {code}}`)
			.namespacedAuth()
			.expect(200)
			.then(({ body }) => {
				[1, 2].forEach(num => {
					const result = body.data.Systems.find(
						s => s.code === systemCode + num,
					);
					expect(result).not.toBeUndefined();
					expect(result).toEqual({ code: systemCode + num });
				});
			});
	});

	describe('access control', () => {
		let sinonSandbox;
		beforeEach(async () => {
			sinonSandbox = sinon.createSandbox();
		});

		afterEach(async () => {
			sinonSandbox.restore();
		});

		const dummyQuery = {
			query: `{
				Systems {
					code
				}
			}`,
			variables: null,
			operationName: null,
		};

		const stubS3o = (req, res) => {
			const cookie = req.get('Cookie');
			const status =
				/s3o_username=.+?;?/.test(cookie) &&
				/s3o_password=.+?;?/.test(cookie)
					? 200
					: 400;
			return res.sendStatus(status);
		};

		it('should allow access to GET /graphiql behind s3o', () => {
			sinonSandbox.stub(security, 'requireS3o').callsFake(stubS3o);

			return request(app, { useCached: false })
				.get('/graphiql')
				.set('Cookie', 's3o_username=test; s3o_password=test')
				.expect(200);
		});

		it('should not allow access to GET /graphiql if s3o fails', () => {
			return request(app)
				.get('/graphiql')
				.expect(302);
		});

		it('should allow access to POST /api/graphql behind s3o', () => {
			sinonSandbox
				.stub(security, 'requireApiKeyOrS3o')
				.callsFake(stubS3o);
			return request(app, { useCached: false })
				.post('/graphql')
				.send(dummyQuery)
				.set('Cookie', 's3o_username=test; s3o_password=test')
				.expect(200);
		});

		it('should allow access to POST /graphql with an API key header and client id', () => {
			return request(app)
				.post('/graphql')
				.send(dummyQuery)
				.namespacedAuth()
				.expect(200);
		});

		it('should not access to POST /graphql if there is no valid s3o auth or API key header', () => {
			return request(app)
				.post('/graphql', dummyQuery)
				.expect(403);
		});

		it('should allow access to GET /graphql with an API key header and client id', () => {
			return request(app)
				.get('/graphql?query={Systems{code}}')
				.namespacedAuth()
				.expect(200);
		});

		it('should not access to GET /graphql if there is no valid s3o auth or API key header', () => {
			return request(app)
				.get('/graphql?query={Systems{code}}')
				.expect(403);
		});
	});
});

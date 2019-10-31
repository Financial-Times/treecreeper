const app = require('../server/app.js');
const { setupMocks } = require('./helpers');

const request = require('./helpers/supertest').getNamespacedSupertest(
	'graphql',
);

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

	it('Return a single system with Document property', async () => {
		await sandbox.createNode('System', {
			code: systemCode,
			troubleshooting: 'Fake Document',
		});
		return sandbox
			.request(app)
			.post('/graphql')
			.send({
				query: `{
					System(code: "${systemCode}") {
						code
						troubleshooting
					}}`,
			})
			.namespacedAuth()
			.expect(200)
			.then(({ body }) => {
				expect(body).toEqual({
					data: {
						System: {
							code: systemCode,
							troubleshooting: 'Fake Document',
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
		const dummyQuery = {
			query: `{
				Systems {
					code
				}
			}`,
			variables: null,
			operationName: null,
		};

		it('should allow access to POST /graphql with an API key header and client id', () => {
			return request(app)
				.post('/graphql')
				.set('client-id', 'test')
				.send(dummyQuery)
				.namespacedAuth()
				.expect(200);
		});

		it('should not access to POST /graphql if there is no valid API key header', () => {
			return request(app)
				.post('/graphql', dummyQuery)
				.set('client-id', 'test')
				.expect(401);
		});

		it('should allow access to GET /graphql with an API key header and client id', () => {
			return request(app)
				.get('/graphql?query={Systems{code}}')
				.set('client-id', 'test')
				.namespacedAuth()
				.expect(200);
		});

		it('should not access to GET /graphql if there is no valid API key header', () => {
			return request(app)
				.get('/graphql?query={Systems{code}}')
				.set('client-id', 'test')
				.expect(401);
		});
	});
});

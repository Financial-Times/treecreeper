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

	const mainCode = `${namespace}-main`;

	it('Return a single record', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
			someString: 'name1',
			someEnum: 'Production',
		});
		return sandbox
			.request(app)
			.post('/graphql')
			.send({
				query: `{
					MainType(code: "${mainCode}") {
						code
						someString
						someEnum
					}}`,
			})
			.namespacedAuth()
			.expect(200)
			.then(({ body }) => {
				expect(body).toEqual({
					data: {
						MainType: {
							code: mainCode,
							someEnum: 'Production',
							someString: 'name1',
						},
					},
				});
			});
	});

	it('Return a single record with Document property', async () => {
		sandbox.setS3Responses({ get: { someDocument: 'Fake Document' } });
		await sandbox.createNode('MainType', {
			code: mainCode,
		});
		return sandbox
			.request(app)
			.post('/graphql')
			.send({
				query: `{
					MainType(code: "${mainCode}") {
						code
						someDocument
					}}`,
			})
			.namespacedAuth()
			.expect(200)
			.then(({ body }) => {
				expect(body).toEqual({
					data: {
						MainType: {
							code: mainCode,
							someDocument: 'Fake Document',
						},
					},
				});
			});
	});

	it('Return a single record via GET request', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
			someString: 'name1',
			someEnum: 'Production',
		});
		return sandbox
			.request(app)
			.get(
				`/graphql?query={MainType(code: "${mainCode}") {code someString someEnum}}`,
			)
			.namespacedAuth()
			.expect(200)
			.then(({ body }) => {
				expect(body).toEqual({
					data: {
						MainType: {
							code: mainCode,
							someEnum: 'Production',
							someString: 'name1',
						},
					},
				});
			});
	});

	it('Return metadata for record', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
		});
		return sandbox
			.request(app)
			.post('/graphql')
			.send({
				query: `{
					MainType(code: "${mainCode}") {
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
						MainType: {
							code: mainCode,
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

	it('Return metadata for record via GET request', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
		});
		return sandbox
			.request(app)
			.get(
				`/graphql?query={
					MainType(code: "${mainCode}") {
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
						MainType: {
							code: mainCode,
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
		const childCode = `${namespace}-child`;
		const [main, child] = await sandbox.createNodes(
			[
				'MainType',
				{
					code: mainCode,
				},
			],
			['ChildType', { code: childCode }],
		);

		await sandbox.connectNodes(main, 'HAS_CHILD', child);
		return sandbox
			.request(app)
			.post('/graphql')
			.send({
				query: `{
					MainType(code: "${mainCode}") {
						code
						children {code}
					}}`,
			})
			.namespacedAuth()
			.expect(200)
			.then(({ body }) => {
				expect(body).toEqual({
					data: {
						MainType: {
							code: mainCode,
							children: [{ code: childCode }],
						},
					},
				});
			});
	});

	it('Returns related entities via GET request', async () => {
		const childCode = `${namespace}-child`;
		const [main, child] = await sandbox.createNodes(
			[
				'MainType',
				{
					code: mainCode,
				},
			],
			['ChildType', { code: childCode }],
		);

		await sandbox.connectNodes(main, 'HAS_CHILD', child);
		return sandbox
			.request(app)
			.get(
				`/graphql?query={MainType(code: "${mainCode}") {code children {code}}}`,
			)
			.namespacedAuth()
			.expect(200)
			.then(({ body }) => {
				expect(body).toEqual({
					data: {
						MainType: {
							code: mainCode,
							children: [{ code: childCode }],
						},
					},
				});
			});
	});

	it('Returns a list of systems', async () => {
		await sandbox.createNodes(
			[
				'MainType',
				{
					code: mainCode + 1,
				},
			],
			[
				'MainType',
				{
					code: mainCode + 2,
				},
			],
		);
		return sandbox
			.request(app)
			.post('/graphql')
			.send({
				query: `{
					MainTypes {
						code
					}}`,
			})
			.namespacedAuth()
			.expect(200)
			.then(({ body }) => {
				[1, 2].forEach(num => {
					const result = body.data.MainTypes.find(
						s => s.code === mainCode + num,
					);
					expect(result).not.toBeUndefined();
					expect(result).toEqual({ code: mainCode + num });
				});
			});
	});

	it('Returns a list of systems via GET request', async () => {
		await sandbox.createNodes(
			[
				'MainType',
				{
					code: mainCode + 1,
				},
			],
			[
				'MainType',
				{
					code: mainCode + 2,
				},
			],
		);
		return sandbox
			.request(app)
			.get(`/graphql?query={MainTypes {code}}`)
			.namespacedAuth()
			.expect(200)
			.then(({ body }) => {
				[1, 2].forEach(num => {
					const result = body.data.MainTypes.find(
						s => s.code === mainCode + num,
					);
					expect(result).not.toBeUndefined();
					expect(result).toEqual({ code: mainCode + num });
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
				MainTypes {
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
				.get('/graphql?query={MainTypes{code}}')
				.namespacedAuth()
				.expect(200);
		});

		it('should not access to GET /graphql if there is no valid s3o auth or API key header', () => {
			return request(app)
				.get('/graphql?query={MainTypes{code}}')
				.expect(403);
		});
	});
});

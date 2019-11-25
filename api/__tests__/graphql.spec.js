const createApp = require('../server/create-app.js');

let app;
const { setupMocks } = require('./helpers');

const request = require('./helpers/supertest').getNamespacedSupertest(
	'graphql',
);

describe('graphql', () => {
	const sandbox = {};

	const namespace = 'graphql-old-api';
	setupMocks(sandbox, { namespace });

	const mainCode = `${namespace}-main`;
	beforeAll(async () => {
		app = await createApp();
	});
	it('Return a single record', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
			someString: 'name1',
			someEnum: 'First',
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
							someEnum: 'First',
							someString: 'name1',
						},
					},
				});
			});
	});

	it('Return a single record via GET request', async () => {
		await sandbox.createNode('MainType', {
			code: mainCode,
			someString: 'name1',
			someEnum: 'First',
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
							someEnum: 'First',
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
							_createdByClient: `${namespace}-init-client`,
							_createdByUser: `${namespace}-init-user`,
							_createdTimestamp: {
								formatted: '2015-11-15T08:12:27.908000000Z',
							},
							_updatedByClient: `${namespace}-client`,
							_updatedByUser: `${namespace}-user`,
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
							_createdByClient: `${namespace}-init-client`,
							_createdByUser: `${namespace}-init-user`,
							_createdTimestamp: {
								formatted: '2015-11-15T08:12:27.908000000Z',
							},
							_updatedByClient: `${namespace}-client`,
							_updatedByUser: `${namespace}-user`,
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
		const dummyQuery = {
			query: `{
				MainTypes {
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
				.get('/graphql?query={MainTypes{code}}')
				.set('client-id', 'test')
				.namespacedAuth()
				.expect(200);
		});

		it('should not access to GET /graphql if there is no valid API key header', () => {
			return request(app)
				.get('/graphql?query={MainTypes{code}}')
				.set('client-id', 'test')
				.expect(401);
		});
	});
});

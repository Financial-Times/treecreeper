const createApp = require('../server/create-app.js');

let app;
const request = require('./helpers/supertest').getNamespacedSupertest('app');

describe('generic app settings', () => {
	beforeAll(async () => {
		app = await createApp();
	});
	it('GET gtg - status code 200', async () => {
		return request(app)
			.get('/__gtg')
			.namespacedAuth()
			.expect(200);
	});

	it('HEAD undefined route - status code 404', async () => {
		return request(app)
			.get('/irrelevant-albatross')
			.namespacedAuth()
			.expect(404, {
				errors: [
					{
						message: 'Not Found',
					},
				],
			});
	});

	it('HEAD v2 can be disabled', async () => {
		process.env.DISABLE_READS = 'true';
		await request(app)
			.get('/v2/node/MainType/test-root')
			.namespacedAuth()
			.expect(
				503,
				/Biz-Ops API is undergoing vital maintenance\. Therefore, reads/,
			);

		delete process.env.DISABLE_READS;
	});

	it('POST v2 can be disabled', async () => {
		process.env.DISABLE_WRITES = 'true';
		await request(app)
			.post('/v2/node/MainType/test-root')
			.namespacedAuth()
			.expect(
				503,
				/Biz-Ops API is undergoing vital maintenance\. Therefore, writes/,
			);

		delete process.env.DISABLE_WRITES;
	});

	it('PATCH v2 can be disabled', async () => {
		process.env.DISABLE_WRITES = 'true';
		await request(app)
			.patch('/v2/node/MainType/test-root')
			.namespacedAuth()
			.expect(
				503,
				/Biz-Ops API is undergoing vital maintenance\. Therefore, writes/,
			);

		delete process.env.DISABLE_WRITES;
	});

	it('DELETE v2 can be disabled', async () => {
		process.env.DISABLE_WRITES = 'true';
		await request(app)
			.delete('/v2/node/MainType/test-root')
			.namespacedAuth()
			.expect(
				503,
				/Biz-Ops API is undergoing vital maintenance\. Therefore, writes/,
			);

		delete process.env.DISABLE_WRITES;
	});

	it('POST graphql can be disabled', async () => {
		process.env.DISABLE_READS = 'true';
		await request(app)
			.post('/graphql')
			.send({
				query: `{
					MainTypes {
						code
					}
				}`,
			})
			.namespacedAuth()
			.expect(
				503,
				/Biz-Ops API is undergoing vital maintenance\. Therefore, reads/,
			);

		delete process.env.DISABLE_READS;
	});

	it('if no API_KEY in environment, will not authorize', async () => {
		const { API_KEY } = process.env;
		delete process.env.API_KEY;
		await request(app)
			.head('/v2/node/MainType/test-root')
			.set('client-id', 'client-id-1')
			.expect(401)
			.expect('debug-error', /Missing or invalid api-key header/);

		process.env.API_KEY = API_KEY;
	});

	it('will authorize using API_KEY_NEW, even if API_KEY present', async () => {
		process.env.API_KEY_NEW = 'new-api-key';
		await request(app)
			.head('/v2/node/MainType/test-root')
			.set('client-id', 'client-id-1')
			.set('api_key', 'new-api-key')
			.expect(404);
		delete process.env.API_KEY_NEW;
	});

	it('will authorize using API_KEY_NEW, if API_KEY missing', async () => {
		const { API_KEY } = process.env;
		delete process.env.API_KEY;
		process.env.API_KEY_NEW = 'new-api-key';
		await request(app)
			.head('/v2/node/MainType/test-root')
			.set('client-id', 'client-id-1')
			.set('api_key', 'new-api-key')
			.expect(404);

		process.env.API_KEY = API_KEY;
		delete process.env.API_KEY_NEW;
	});
});

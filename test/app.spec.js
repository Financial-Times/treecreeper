const app = require('../server/app.js');
const request = require('./helpers/supertest').getNamespacedSupertest('app');

describe('generic app settings', () => {
	it('GET gtg - status code 200', async () => {
		return request(app)
			.get('/__gtg')
			.namespacedAuth()
			.expect(200);
	});

	it('GET undefined route - status code 404', async () => {
		return request(app)
			.get('/irrelevant-albatross')
			.namespacedAuth()
			.expect(404, {
				errors: [
					{
						message: 'Not Found'
					}
				]
			});
	});

	it('GET v2 can be disabled', async () => {
		process.env.DISABLE_READS = 'true';
		await request(app)
			.get('/v2/node/System/test-system')
			.namespacedAuth()
			.expect(
				503,
				/Biz-Ops API is undergoing vital maintenance\. Therefore, reads/
			);

		delete process.env.DISABLE_READS;
	});

	it('POST v2 can be disabled', async () => {
		process.env.DISABLE_WRITES = 'true';
		await request(app)
			.post('/v2/node/System/test-system')
			.namespacedAuth()
			.expect(
				503,
				/Biz-Ops API is undergoing vital maintenance\. Therefore, writes/
			);

		delete process.env.DISABLE_WRITES;
	});

	it('PATCH v2 can be disabled', async () => {
		process.env.DISABLE_WRITES = 'true';
		await request(app)
			.patch('/v2/node/System/test-system')
			.namespacedAuth()
			.expect(
				503,
				/Biz-Ops API is undergoing vital maintenance\. Therefore, writes/
			);

		delete process.env.DISABLE_WRITES;
	});

	it('DELETE v2 can be disabled', async () => {
		process.env.DISABLE_WRITES = 'true';
		await request(app)
			.delete('/v2/node/System/test-system')
			.namespacedAuth()
			.expect(
				503,
				/Biz-Ops API is undergoing vital maintenance\. Therefore, writes/
			);

		delete process.env.DISABLE_WRITES;
	});

	it('POST graphql can be disabled', async () => {
		process.env.DISABLE_READS = 'true';
		await request(app)
			.post('/graphql')
			.send({
				query: `{
					Systems {
						code
					}
				}`
			})
			.namespacedAuth()
			.expect(
				503,
				/Biz-Ops API is undergoing vital maintenance\. Therefore, reads/
			);

		delete process.env.DISABLE_READS;
	});
});

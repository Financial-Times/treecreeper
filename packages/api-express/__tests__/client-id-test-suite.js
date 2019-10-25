const request = require('supertest');

const testSuite = (
	appGetter,
	method,
	url,
	goodStatus,
	recordCreator = () => null,
) =>
	describe('client headers', () => {
		const app = appGetter();
		it(`no client-id or client-user-id returns 400`, async () => {
			await recordCreator();
			return request(app)
				[method](url)
				.expect(400);
		});

		it(`client-id but no client-user-id returns ${goodStatus}`, async () => {
			await recordCreator();
			return request(app)
				[method](url)
				.set('client-id', 'test-client-id')
				.expect(goodStatus);
		});

		it(`client-user-id but no client-id returns ${goodStatus}`, async () => {
			await recordCreator();
			return request(app)
				[method](url)
				.set('client-user-id', 'test-user-id')
				.expect(goodStatus);
		});

		it(`client-id and client-user-id returns ${goodStatus}`, async () => {
			await recordCreator();
			return request(app)
				[method](url)
				.set('client-id', 'test-client-id')
				.set('client-user-id', 'test-user-id')
				.expect(goodStatus);
		});
	});
module.exports = { testSuite };

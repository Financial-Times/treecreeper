const request = require('supertest');

const allowedMethods = ['get', 'head', 'post', 'patch', 'delete', 'absorb'];

const exceptMethod = targetMethod =>
	allowedMethods.filter(method => method !== targetMethod);

describe('api-express disallows methods', () => {
	allowedMethods.forEach(method => {
		it(`${method.toUpperCase()} method is forbidden`, async () => {
			const config = { restMethods: exceptMethod(method) };
			const { getApp } = require('..');
			const app = await getApp(config);
			const namespace = `api-express-${method}`;
			const mainCode = `${namespace}-main`;
			const otherCode = `${namespace}-other`;
			const restUrl =
				method === 'absorb'
					? `/rest/MainType/${mainCode}/absorb/${otherCode}`
					: `/rest/MainType/${mainCode}?upsert=yes`;
			const getRequestMethod = () =>
				method === 'absorb' ? 'post' : method;

			const expectMessage = (status, message) =>
				method === 'head' ? [status] : [status, message];

			await request(app)
				[getRequestMethod()](restUrl)
				.set('client-id', 'test-client-id')
				.set('client-user-id', 'test-user-id')
				.set('request-id', 'test-request-id')
				.expect(
					...expectMessage(405, { message: 'Method not allowed' }),
				);
		});
	});
});

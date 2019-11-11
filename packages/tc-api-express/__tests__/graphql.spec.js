const request = require('supertest');

describe('api-express graphql', () => {
	let apiGraphql;
	let app;
	const config = { fake: 'config', graphqlMethods: ['post', 'get'] };
	beforeAll(async () => {
		apiGraphql = require('@financial-times/tc-api-graphql');
		jest.spyOn(apiGraphql, 'getGraphqlApi');
		const { getApp } = require('..');
		app = await getApp(config);
	});

	it('passes on config to the graphql api', async () => {
		expect(apiGraphql.getGraphqlApi).toHaveBeenCalledWith(config);
	});

	it('can support GET requests', async () => {
		await request(app)
			.get('/graphql?query={MainType(code: "test") {code}}')
			.set('client-id', 'test-client-id')
			.expect(200);
	});
	it('supports POST requests', async () => {
		await request(app)
			.post('/graphql')
			.send({ query: '{MainType(code: "test") {code}}' })
			.set('client-id', 'test-client-id')
			.expect(200);
	});
});

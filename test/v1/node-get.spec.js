const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { session: db } = require('../../server/db-connection');

const { checkResponse, setupMocks } = require('./helpers');

describe('v1 - node GET', () => {
	const state = {};

	setupMocks(state);

	it('gets node without relationships', async () => {
		return request(app)
			.get('/v1/node/System/test-system')
			.auth()
			.expect(200, {
				node: {
					code: 'test-system',
					foo: 'bar1'
				},
				relationships: []
			});
	});

	it('gets node with relationships', async () => {
		// create the relationships
		await db.run(`MATCH (s:System { code: "test-system" }), (p:Person { code: "test-person" }), (g:Group { code: "test-group" })
									MERGE (g)-[o:OWNS]->(s)-[t:HAS_TECH_LEAD]->(p)
									RETURN g, o, s, t, p`);

		return request(app)
			.get('/v1/node/System/test-system')
			.auth()
			.expect(200)
			.then(({ body }) =>
				checkResponse(body, {
					node: {
						code: 'test-system',
						foo: 'bar1'
					},
					relationships: {
						HAS_TECH_LEAD: [
							{
								direction: 'outgoing',
								nodeType: 'Person',
								nodeCode: 'test-person'
							}
						],
						OWNS: [
							{
								direction: 'incoming',
								nodeType: 'Group',
								nodeCode: 'test-group'
							}
						]
					}
				})
			);
	});

	it('responds with 404 if no node', async () => {
		return request(app)
			.get('/v1/node/System/not-test-system')
			.auth()
			.expect(404);
	});

	it('responds with 500 if query fails', async () => {
		state.sandbox.stub(db, 'run').throws('oh no');
		return request(app)
			.get('/v1/node/System/test-system')
			.auth()
			.expect(500);
	});

	it('has case insensitive url', async () => {
		return request(app)
			.get('/v1/node/system/tEst-SYstem')
			.auth()
			.expect(200);
	});
});

const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { session: db } = require('../../server/db-connection');

const { setupMocks } = require('./helpers');

describe('v1 - relationship GET', () => {
	const state = {};

	setupMocks(state, { withRelationships: true });

	it('gets a relationship', async () => {
		return request(app)
			.get('/v1/relationship/Team/test-team/HAS_TECH_LEAD/Person/test-person')
			.auth()
			.expect(200, { createdByRequest: 'setup-script' });
	});

	it("responds with 404 if relationship doesn't exist", async () => {
		return request(app)
			.get(
				'/v1/relationship/Team/test-team/HAS_DELIVERY_LEAD/Person/test-person'
			)
			.auth()
			.expect(404);
	});

	it("responds with 404 if start node doesn't exist", async () => {
		return request(app)
			.get(
				'/v1/relationship/Team/not-test-team/HAS_TECH_LEAD/Person/test-person'
			)
			.auth()
			.expect(404);
	});

	it("responds with 404 if end node doesn't exist", async () => {
		return request(app)
			.get(
				'/v1/relationship/Team/test-team/HAS_TECH_LEAD/Person/not-test-person'
			)
			.auth()
			.expect(404);
	});

	it('responds with 500 if query fails', async () => {
		state.sandbox.stub(db, 'run').throws('oh no');
		return request(app)
			.get('/v1/relationship/Team/test-team/HAS_TECH_LEAD/Person/test-person')
			.auth()
			.expect(500);
	});
});

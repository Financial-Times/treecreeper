const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { setupMocks, stubDbUnavailable } = require('./helpers');

describe('v1 - relationship GET', () => {
	const state = {};

	setupMocks(state, { withRelationships: true });

	it('gets a relationship', async () => {
		return request(app)
			.get('/v1/relationship/Team/test-team/HAS_TECH_LEAD/Person/test-person')
			.auth()
			.expect(200, {
				_createdByRequest: 'setup-script',
				_createdByClient: 'setup-client-script',
				_createdTimestamp: '12345'
			});
	});

	it("responds with 404 if relationship doesn't exist", async () => {
		return request(app)
			.get(
				'/v1/relationship/Team/test-team/HAS_PRODUCT_OWNER/Person/test-person'
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
		stubDbUnavailable(state);
		return request(app)
			.get('/v1/relationship/Team/test-team/HAS_TECH_LEAD/Person/test-person')
			.auth()
			.expect(500);
	});
});

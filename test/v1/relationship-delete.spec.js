const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { expect } = require('chai');

const { setupMocks, getRelationship } = require('./helpers');

describe('v1 - relationship DELETE', () => {
	const state = {};

	setupMocks(state, { withRelationships: true });

	it('deletes a relationship', async () => {
		await request(app)
			.delete(
				'/v1/relationship/Team/test-team/HAS_TECH_LEAD/Person/test-person'
			)
			.auth()
			.expect(204);

		const result = await getRelationship();

		expect(result.records.length).to.equal(0);
	});

	it("responds with 404 if relationship doesn't exist", async () => {
		return request(app)
			.delete(
				'/v1/relationship/Team/test-team/HAS_DELIVERY_LEAD/Person/test-person'
			)
			.auth()
			.expect(404);
	});

	it("responds with 404 if start node doesn't exist", async () => {
		return request(app)
			.delete(
				'/v1/relationship/Team/not-test-team/HAS_TECH_LEAD/Person/test-person'
			)
			.auth()
			.expect(404);
	});

	it("responds with 404 if end node doesn't exist", async () => {
		return request(app)
			.delete(
				'/v1/relationship/Team/test-team/HAS_TECH_LEAD/Person/not-test-person'
			)
			.auth()
			.expect(404);
	});

	it('logs deletion event to kinesis', async () => {
		await request(app)
			.delete(
				'/v1/relationship/Team/test-team/HAS_TECH_LEAD/Person/test-person'
			)
			.set('x-request-id', 'delete-relationship-request')
			.set('x-client-id', 'delete-relationship-client')
			.auth()
			.expect(204);
		[
			[
				{
					event: 'DELETED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TECH_LEAD',
						direction: 'outgoing',
						nodeCode: 'test-person',
						nodeType: 'Person'
					},
					code: 'test-team',
					type: 'Team',
					requestId: 'delete-relationship-request',
					clientId: 'delete-relationship-client'
				}
			],
			[
				{
					event: 'DELETED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TECH_LEAD',
						direction: 'incoming',
						nodeCode: 'test-team',
						nodeType: 'Team'
					},
					code: 'test-person',
					type: 'Person',
					requestId: 'delete-relationship-request',
					clientId: 'delete-relationship-client'
				}
			]
		].map(args => expect(state.stubSendEvent).calledWith(...args));
	});
});

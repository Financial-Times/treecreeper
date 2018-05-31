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
				'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person'
			)
			.auth()
			.expect(204);

		const result = await getRelationship();

		expect(result.records.length).to.equal(0);
	});

	it("responds with 404 if relationship doesn't exist", async () => {
		return request(app)
			.delete(
				'/v1/relationship/System/test-system/HAS_PARROT/Person/test-person'
			)
			.auth()
			.expect(404);
	});

	it("responds with 404 if start node doesn't exist", async () => {
		return request(app)
			.delete(
				'/v1/relationship/System/not-test-system/HAS_TECH_LEAD/Person/test-person'
			)
			.auth()
			.expect(404);
	});

	it("responds with 404 if end node doesn't exist", async () => {
		return request(app)
			.delete(
				'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/not-test-person'
			)
			.auth()
			.expect(404);
	});

	it('has case insensitive url', async () => {
		await request(app)
			.delete(
				'/v1/relationship/sYstem/teSt-sYstem/Has_tECH_LEAD/pErson/tESt-person'
			)
			.auth()
			.expect(204);

		const result = await getRelationship();

		expect(result.records.length).to.equal(0);
	});

	it('logs deletion event to kinesis', async () => {
		await request(app)
			.delete(
				'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person'
			)
			.set('x-request-id', 'delete-relationship-request')
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
					code: 'test-system',
					type: 'System',
					requestId: 'delete-relationship-request'
				}
			],
			[
				{
					event: 'DELETED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TECH_LEAD',
						direction: 'incoming',
						nodeCode: 'test-system',
						nodeType: 'System'
					},
					code: 'test-person',
					type: 'Person',
					requestId: 'delete-relationship-request'
				}
			]
		].map(args => expect(state.stubSendEvent).calledWith(...args));
	});
});

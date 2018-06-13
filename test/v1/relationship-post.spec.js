const { expect } = require('chai');
const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { session: db } = require('../../server/db-connection');
const { setupMocks, getRelationship } = require('./helpers');

describe('v1 - relationship POST', () => {
	const state = {};

	setupMocks(state);

	it('creates a relationship', async () => {
		await request(app)
			.post('/v1/relationship/Team/test-team/HAS_TECH_LEAD/Person/test-person')
			.set('x-request-id', 'create-relationship-request')
			.auth()
			.expect(200, { createdByRequest: 'create-relationship-request' });

		const result = await getRelationship();

		expect(result.records.length).to.equal(1);
		expect(result.records[0].get('relationship').properties).to.eql({
			createdByRequest: 'create-relationship-request'
		});
	});

	it('error when creating duplicate relationship', async () => {
		await db.run(
			`MATCH (node:Team { code: 'test-team' }), (relatedNode:Person { code: 'test-person' })
			CREATE UNIQUE (node)-[relationship:HAS_TECH_LEAD {createdByRequest: 'setup-query'}]->(relatedNode)
			RETURN relationship`
		);

		await request(app)
			.post('/v1/relationship/Team/test-team/HAS_TECH_LEAD/Person/test-person')
			.set('x-request-id', 'create-relationship-request')
			.auth()
			.expect(409);

		const result = await getRelationship();
		expect(result.records.length).to.equal(1);
	});

	it('add attributes to created relationship', async () => {
		await request(app)
			.post('/v1/relationship/Team/test-team/HAS_TECH_LEAD/Person/test-person')
			.set('x-request-id', 'create-relationship-request')
			.send({ foo: 'bar' })
			.auth()
			.expect(200, {
				createdByRequest: 'create-relationship-request',
				foo: 'bar'
			});

		const result = await getRelationship();
		expect(result.records.length).to.equal(1);
		expect(result.records[0].get('relationship').properties).to.eql({
			createdByRequest: 'create-relationship-request',
			foo: 'bar'
		});
	});

	it('error when creating relationship from non-existent node', async () => {
		await request(app)
			.post(
				'/v1/relationship/Team/not-test-team/HAS_TECH_LEAD/Person/test-person'
			)
			.set('x-request-id', 'create-relationship-request')
			.auth()
			.expect(400);

		const result = await getRelationship();
		expect(result.records.length).to.equal(0);
	});

	it('error when creating relationship to non-existent node', async () => {
		await request(app)
			.post(
				'/v1/relationship/Team/test-team/HAS_TECH_LEAD/Person/not-test-person'
			)
			.set('x-request-id', 'create-relationship-request')
			.auth()
			.expect(400);

		const result = await getRelationship();
		expect(result.records.length).to.equal(0);
	});

	it('responds with 500 if query fails', async () => {
		state.sandbox.stub(db, 'run').throws('oh no');
		return request(app)
			.post('/v1/relationship/Team/test-team/HAS_TECH_LEAD/Person/test-person')
			.auth()
			.expect(500);
	});

	it('logs creation events to kinesis', async () => {
		await request(app)
			.post('/v1/relationship/Team/test-team/HAS_TECH_LEAD/Person/test-person')
			.set('x-request-id', 'create-relationship-request')
			.auth()
			.expect(200);

		[
			[
				{
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TECH_LEAD',
						direction: 'outgoing',
						nodeCode: 'test-person',
						nodeType: 'Person'
					},
					code: 'test-team',
					type: 'Team',
					requestId: 'create-relationship-request'
				}
			],
			[
				{
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TECH_LEAD',
						direction: 'incoming',
						nodeCode: 'test-team',
						nodeType: 'Team'
					},
					code: 'test-person',
					type: 'Person',
					requestId: 'create-relationship-request'
				}
			]
		].map(args => expect(state.stubSendEvent).calledWith(...args));
	});
});

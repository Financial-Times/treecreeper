const { expect } = require('chai');
const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { session: db } = require('../../server/db-connection');
const { setupMocks, getRelationship } = require('./helpers');
const lolex = require('lolex');

describe('v1 - relationship POST', () => {
	const state = {};
	let clock;
	const timestamp = 1528458548930;
	const formattedTimestamp = 'Fri, 08 Jun 2018 11:49:08 GMT';

	setupMocks(state);
	beforeEach(() => {
		clock = lolex.install({ now: timestamp });
	});

	afterEach(() => {
		clock.uninstall();
	});

	it('creates a relationship', async () => {
		await request(app)
			.post('/v1/relationship/Team/test-team/HAS_TECH_LEAD/Person/test-person')
			.set('x-request-id', 'create-relationship-request')
			.set('x-client-id', 'create-relationship-client')
			.auth()
			.expect(200, {
				_createdByRequest: 'create-relationship-request',
				_createdByClient: 'create-relationship-client',
				_createdTimestamp: formattedTimestamp,
				_updatedByRequest: 'create-relationship-request',
				_updatedByClient: 'create-relationship-client',
				_updatedTimestamp: formattedTimestamp
			});

		const result = await getRelationship();
		expect(result.records.length).to.equal(1);
		expect(result.records[0].get('relationship').properties).to.eql({
			_createdByRequest: 'create-relationship-request',
			_createdByClient: 'create-relationship-client',
			_createdTimestamp: formattedTimestamp,
			_updatedByRequest: 'create-relationship-request',
			_updatedByClient: 'create-relationship-client',
			_updatedTimestamp: formattedTimestamp
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
			.set('x-client-id', 'create-relationship-client')
			.auth()
			.expect(409);

		const result = await getRelationship();
		expect(result.records.length).to.equal(1);
	});

	it('add attributes to created relationship', async () => {
		await request(app)
			.post('/v1/relationship/Team/test-team/HAS_TECH_LEAD/Person/test-person')
			.set('x-request-id', 'create-relationship-request')
			.set('x-client-id', 'create-relationship-client')
			.send({ foo: 'bar' })
			.auth()
			.expect(200, {
				_createdByRequest: 'create-relationship-request',
				_createdByClient: 'create-relationship-client',
				_createdTimestamp: formattedTimestamp,
				_updatedByRequest: 'create-relationship-request',
				_updatedByClient: 'create-relationship-client',
				_updatedTimestamp: formattedTimestamp,
				foo: 'bar'
			});

		const result = await getRelationship();
		expect(result.records.length).to.equal(1);
		expect(result.records[0].get('relationship').properties).to.eql({
			_createdByRequest: 'create-relationship-request',
			_createdByClient: 'create-relationship-client',
			_createdTimestamp: formattedTimestamp,
			_updatedByRequest: 'create-relationship-request',
			_updatedByClient: 'create-relationship-client',
			_updatedTimestamp: formattedTimestamp,
			foo: 'bar'
		});
	});

	it('error when creating relationship from non-existent node', async () => {
		await request(app)
			.post(
				'/v1/relationship/Team/not-test-team/HAS_TECH_LEAD/Person/test-person'
			)
			.set('x-request-id', 'create-relationship-request')
			.set('x-client-id', 'create-relationship-client')
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
			.set('x-client-id', 'create-relationship-client')
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
			.set('x-client-id', 'create-relationship-client')
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
					clientId: 'create-relationship-client',
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
					requestId: 'create-relationship-request',
					clientId: 'create-relationship-client'
				}
			]
		].map(args => expect(state.stubSendEvent).calledWith(...args));
	});
});

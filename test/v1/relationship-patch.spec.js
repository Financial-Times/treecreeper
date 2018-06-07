const { expect } = require('chai');
const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { session: db } = require('../../server/db-connection');
const { setupMocks, getRelationship } = require('./helpers');

describe('v1 - relationship PATCH', () => {
	const state = {};

	setupMocks(state, { withRelationships: true });

	beforeEach(() =>
		db.run(`
			MATCH (node:System { code: 'test-system' })-[relationship:HAS_TECH_LEAD]->(relatedNode:Person { code: 'test-person' })
			SET relationship.foo = 'bar'
			RETURN relationship`));

	it('updates a relationship', async () => {
		await request(app)
			.patch(
				'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person'
			)
			.set('x-request-id', 'update-relationship-request')
			.set('x-client-id', 'update-relationship-client')
			.send({ foo: 'baz' })
			.auth()
			.expect(200, { _createdByRequest: 'setup-script', foo: 'baz' });

		const result = await getRelationship();

		expect(result.records.length).to.equal(1);
		expect(result.records[0].get('relationship').properties).to.eql({
			_createdByRequest: 'setup-script',
			foo: 'baz'
		});
	});

	it('Creates when patching non-existent relationship', async () => {
		await request(app)
			.patch(
				'/v1/relationship/System/test-system/HAS_TEAM_MEMBER/Person/test-person'
			)
			.set('x-request-id', 'update-relationship-request')
			.set('x-client-id', 'update-relationship-client')
			.send({ foo: 'baz' })
			.auth()
			.expect(201, {
				_createdByRequest: 'update-relationship-request',
				foo: 'baz'
			});

		const result = await getRelationship('HAS_TEAM_MEMBER');

		expect(result.records.length).to.equal(1);
		expect(result.records[0].get('relationship').properties).to.eql({
			_createdByRequest: 'update-relationship-request',
			foo: 'baz'
		});
	});

	it("deletes attributes which are provided as 'null'", async () => {
		await request(app)
			.patch(
				'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person'
			)
			.set('x-request-id', 'update-relationship-request')
			.set('x-client-id', 'update-relationship-client')
			.send({ foo: null, baz: null })
			.auth()
			.expect(200, { _createdByRequest: 'setup-script' });

		const result = await getRelationship();

		expect(result.records.length).to.equal(1);
		expect(result.records[0].get('relationship').properties).to.eql({
			_createdByRequest: 'setup-script'
		});
	});

	it('error when updating relationship from non-existent node', async () => {
		await request(app)
			.patch(
				'/v1/relationship/System/not-test-system/HAS_TECH_LEAD/Person/test-person'
			)
			.set('x-request-id', 'update-relationship-request')
			.set('x-client-id', 'update-relationship-client')
			.auth()
			.expect(400);
	});

	it('error when updating relationship to non-existent node', async () => {
		await request(app)
			.patch(
				'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/not-test-person'
			)
			.set('x-request-id', 'update-relationship-request')
			.set('x-client-id', 'update-relationship-client')
			.auth()
			.expect(400);
	});

	it('responds with 500 if query fails', async () => {
		state.sandbox.stub(db, 'run').throws('oh no');
		return request(app)
			.patch(
				'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person'
			)
			.auth()
			.expect(500);
	});

	it('has case insensitive url', async () => {
		await request(app)
			.patch(
				'/v1/relationship/sYstem/tESt-System/haS_TeCH_LEAD/pERson/TesT-PErson'
			)
			.set('x-request-id', 'update-relationship-request')
			.set('x-client-id', 'update-relationship-client')
			.send({ foo: 'baz' })
			.auth()
			.expect(200, { _createdByRequest: 'setup-script', foo: 'baz' });

		const result = await getRelationship();

		expect(result.records.length).to.equal(1);
		expect(result.records[0].get('relationship').properties).to.eql({
			_createdByRequest: 'setup-script',
			foo: 'baz'
		});
	});

	it('logs update events to kinesis', async () => {
		await request(app)
			.patch(
				'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person'
			)
			.set('x-request-id', 'update-relationship-request')
			.set('x-client-id', 'update-relationship-client')
			.send({ foo: 'baz' })
			.auth()
			.expect(200);

		[
			[
				{
					event: 'UPDATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TECH_LEAD',
						direction: 'outgoing',
						nodeCode: 'test-person',
						nodeType: 'Person'
					},
					code: 'test-system',
					type: 'System',
					requestId: 'update-relationship-request',
					clientId: 'update-relationship-client'
				}
			],
			[
				{
					event: 'UPDATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TECH_LEAD',
						direction: 'incoming',
						nodeCode: 'test-system',
						nodeType: 'System'
					},
					code: 'test-person',
					type: 'Person',
					requestId: 'update-relationship-request',
					clientId: 'update-relationship-client'
				}
			]
		].map(args => expect(state.stubSendEvent).calledWith(...args));
	});
});

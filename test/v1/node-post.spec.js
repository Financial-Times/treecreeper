const { expect } = require('chai');
const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { session: db } = require('../../server/db-connection');
const { checkResponse, setupMocks } = require('./helpers');
const lolex = require('lolex');

describe('v1 - node POST', () => {
	const state = {};
	setupMocks(state);

	let clock;
	const timestamp = 1528458548930;
	const formattedTimestamp = 'Fri, 08 Jun 2018 11:49:08 GMT';

	const cleanUp = async () => {
		await db.run(`MATCH (n:Team { code: "new-team" }) DETACH DELETE n`);
		await db.run(
			`MATCH (n:Person { code: "new-test-person" }) DETACH DELETE n`
		);
	};

	beforeEach(async () => {
		await cleanUp();
		clock = lolex.install({ now: timestamp });
	});

	afterEach(async () => {
		await cleanUp();
		clock = clock.uninstall();
	});

	it('create node', async () => {
		await request(app)
			.post('/v1/node/Team/new-team')
			.auth()
			.set('x-request-id', 'create-request-id')
			.set('x-client-id', 'create-client-id')
			.send({ node: { foo: 'new' } })
			.expect(200, {
				node: {
					code: 'new-team',
					foo: 'new',
					_createdByClient: 'create-client-id',
					_createdByRequest: 'create-request-id',
					_createdTimestamp: formattedTimestamp,
					_updatedByClient: 'create-client-id',
					_updatedByRequest: 'create-request-id',
					_updatedTimestamp: formattedTimestamp
				},
				relationships: []
			});
		const result = await db.run(
			`MATCH (n:Team { code: "new-team" }) RETURN n`
		);

		expect(result.records.length).to.equal(1);
		const record = result.records[0];
		expect(record.get('n').properties).to.eql({
			code: 'new-team',
			foo: 'new',
			_createdByClient: 'create-client-id',
			_createdByRequest: 'create-request-id',
			_createdTimestamp: formattedTimestamp,
			_updatedByClient: 'create-client-id',
			_updatedByRequest: 'create-request-id',
			_updatedTimestamp: formattedTimestamp
		});
		expect(record.get('n').labels).to.eql(['Team']);
	});

	it('error when creating duplicate node', async () => {
		await request(app)
			.post('/v1/node/Team/test-team')
			.auth()
			.send({ node: { foo: 'new-again' } })
			.expect(409, /Team test-team already exists/);
	});

	it('error when conflicting code values', async () => {
		await request(app)
			.post('/v1/node/Team/new-team')
			.auth()
			.send({ node: { foo: 'new', code: 'wrong-code' } })
			.expect(400, /Conflicting code attribute `wrong-code` for Team new-team/);
	});

	it('not error when non-conflicting code values', async () => {
		await request(app)
			.post('/v1/node/Team/new-team')
			.auth()
			.send({ node: { foo: 'new', code: 'new-team' } })
			.expect(200);
	});

	it('create node related to existing nodes', async () => {
		const relationships = {
			HAS_TECH_LEAD: [
				{
					direction: 'outgoing',
					nodeType: 'Person',
					nodeCode: 'test-person'
				}
			],
			HAS_TEAM: [
				{
					direction: 'incoming',
					nodeType: 'Group',
					nodeCode: 'test-group'
				}
			]
		};
		await request(app)
			.post('/v1/node/Team/new-team')
			.auth()
			.set('x-request-id', 'create-request-id')
			.set('x-client-id', 'create-client-id')
			.send({
				node: { foo: 'new' },
				relationships
			})
			.expect(200)
			.then(({ body }) =>
				checkResponse(body, {
					node: {
						code: 'new-team',
						foo: 'new',
						_createdByClient: 'create-client-id',
						_createdByRequest: 'create-request-id',
						_createdTimestamp: formattedTimestamp,
						_updatedByClient: 'create-client-id',
						_updatedByRequest: 'create-request-id',
						_updatedTimestamp: formattedTimestamp
					},
					relationships
				})
			);

		const result = await db.run(
			`MATCH (n:Team { code: "new-team" })-[r]-(c) RETURN n, r, c`
		);

		expect(result.records.length).to.equal(2);

		expect(result.records[0].get('n').properties).to.eql({
			code: 'new-team',
			foo: 'new',
			_createdByClient: 'create-client-id',
			_createdByRequest: 'create-request-id',
			_createdTimestamp: formattedTimestamp,
			_updatedByClient: 'create-client-id',
			_updatedByRequest: 'create-request-id',
			_updatedTimestamp: formattedTimestamp
		});

		const [person, group] =
			result.records[0].get('c').labels[0] === 'Person'
				? result.records
				: result.records.slice().reverse();

		expect(group.get('r').properties).to.eql({
			_createdByRequest: 'create-request-id'
		});
		expect(group.get('c').properties._createdByRequest).to.not.exist;
		expect(group.get('c').properties).to.eql({
			foo: 'bar3',
			code: 'test-group'
		});

		expect(person.get('r').properties).to.eql({
			_createdByRequest: 'create-request-id'
		});
		expect(person.get('c').properties._createdByRequest).to.not.exist;
		expect(person.get('c').properties).to.eql({
			foo: 'bar2',
			code: 'test-person'
		});
	});

	it('error when creating node related to non-existent nodes', async () => {
		await request(app)
			.post('/v1/node/Team/new-team')
			.auth()
			.set('x-request-id', 'create-request-id')
			.send({
				node: { foo: 'new' },
				relationships: {
					HAS_TECH_LEAD: [
						{
							direction: 'outgoing',
							nodeType: 'Person',
							nodeCode: 'new-test-person'
						}
					]
				}
			})
			.expect(400, /Missing related node Person new-test-person/);
	});

	it('create node related to non-existent nodes when using upsert=true', async () => {
		const relationships = {
			HAS_TECH_LEAD: [
				{
					direction: 'outgoing',
					nodeType: 'Person',
					nodeCode: 'new-test-person'
				}
			]
		};

		await request(app)
			.post('/v1/node/Team/new-team?upsert=true')
			.auth()
			.set('x-request-id', 'create-request-id')
			.set('x-client-id', 'create-client-id')
			.send({
				node: { foo: 'new' },
				relationships
			})
			.expect(200)
			.then(({ body }) =>
				checkResponse(body, {
					node: {
						code: 'new-team',
						foo: 'new',
						_createdByClient: 'create-client-id',
						_createdByRequest: 'create-request-id',
						_createdTimestamp: formattedTimestamp,
						_updatedByClient: 'create-client-id',
						_updatedByRequest: 'create-request-id',
						_updatedTimestamp: formattedTimestamp
					},
					relationships
				})
			);
		const result = await db.run(
			`MATCH (n:Team { code: "new-team" })-[r]-(c) RETURN n, r, c`
		);
		expect(result.records.length).to.equal(1);
		const record0 = result.records[0];

		expect(record0.get('n').properties).to.eql({
			code: 'new-team',
			foo: 'new',
			_createdByClient: 'create-client-id',
			_createdByRequest: 'create-request-id',
			_createdTimestamp: formattedTimestamp,
			_updatedByClient: 'create-client-id',
			_updatedByRequest: 'create-request-id',
			_updatedTimestamp: formattedTimestamp
		});
		expect(record0.get('r').properties).to.eql({
			_createdByRequest: 'create-request-id'
		});
		expect(record0.get('c').properties).to.eql({
			code: 'new-test-person',
			_createdByRequest: 'create-request-id'
		});
	});

	it('not set `createdByRequest` on things that already existed when using `upsert=true`', async () => {
		await request(app)
			.post('/v1/node/Team/new-team?upsert=true')
			.auth()
			.set('x-request-id', 'create-request-id')
			.set('x-client-id', 'create-client-id')
			.send({
				node: { foo: 'new' },
				relationships: {
					HAS_TECH_LEAD: [
						{
							direction: 'outgoing',
							nodeType: 'Person',
							nodeCode: 'test-person'
						}
					]
				}
			})
			.expect(200);

		const result = await db.run(
			`MATCH (n:Team { code: "new-team" })-[r]-(c) RETURN n, r, c`
		);
		expect(result.records.length).to.equal(1);
		const record0 = result.records[0];
		expect(record0.get('n').properties).to.eql({
			code: 'new-team',
			foo: 'new',
			_createdByClient: 'create-client-id',
			_createdByRequest: 'create-request-id',
			_createdTimestamp: formattedTimestamp,
			_updatedByClient: 'create-client-id',
			_updatedByRequest: 'create-request-id',
			_updatedTimestamp: formattedTimestamp
		});
		expect(record0.get('r').properties).to.eql({
			_createdByRequest: 'create-request-id'
		});
		expect(record0.get('c').properties._createdByRequest).to.not.exist;
		expect(record0.get('c').properties).to.eql({
			foo: 'bar2',
			code: 'test-person'
		});
	});

	it('responds with 500 if query fails', async () => {
		state.sandbox.stub(db, 'run').throws('oh no');
		return request(app)
			.post('/v1/node/Team/new-team')
			.auth()
			.send({
				node: { foo: 'new' }
			})
			.expect(500);
	});

	it('logs creation events to kinesis', async () => {
		await request(app)
			.post('/v1/node/Team/new-team?upsert=true')
			.auth()
			.set('x-request-id', 'create-request-id')
			.set('x-client-id', 'create-client-id')
			.send({
				// create a node
				node: { foo: 'new' },
				relationships: {
					HAS_TECH_LEAD: [
						{
							// connect to new node
							direction: 'outgoing',
							nodeType: 'Person',
							nodeCode: 'new-test-person'
						}
					],
					HAS_TEAM: [
						{
							//connect to existing node
							direction: 'incoming',
							nodeType: 'Group',
							nodeCode: 'test-group'
						}
					]
				}
			});

		[
			[
				{
					event: 'CREATED_NODE',
					action: 'CREATE',
					code: 'new-team',
					type: 'Team',
					requestId: 'create-request-id',
					clientId: 'create-client-id'
				}
			],
			[
				{
					event: 'CREATED_NODE',
					action: 'CREATE',
					code: 'new-test-person',
					type: 'Person',
					requestId: 'create-request-id',
					clientId: 'create-client-id'
				}
			],
			[
				{
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TECH_LEAD',
						direction: 'outgoing',
						nodeCode: 'new-test-person',
						nodeType: 'Person'
					},
					code: 'new-team',
					type: 'Team',
					requestId: 'create-request-id',
					clientId: 'create-client-id'
				}
			],
			[
				{
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TECH_LEAD',
						direction: 'incoming',
						nodeCode: 'new-team',
						nodeType: 'Team'
					},
					code: 'new-test-person',
					type: 'Person',
					requestId: 'create-request-id',
					clientId: 'create-client-id'
				}
			],
			[
				{
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TEAM',
						direction: 'incoming',
						nodeCode: 'test-group',
						nodeType: 'Group'
					},
					code: 'new-team',
					type: 'Team',
					requestId: 'create-request-id',
					clientId: 'create-client-id'
				}
			],
			[
				{
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TEAM',
						direction: 'outgoing',
						nodeCode: 'new-team',
						nodeType: 'Team'
					},
					code: 'test-group',
					type: 'Group',
					requestId: 'create-request-id',
					clientId: 'create-client-id'
				}
			]
		].map(args => expect(state.stubSendEvent).calledWith(...args));

		return db.run('MATCH (g:Person {code: "new-test-person"}) DETACH DELETE g');
	});
});

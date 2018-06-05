const { expect } = require('chai');
const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { session: db } = require('../../server/db-connection');
const { checkResponse, setupMocks } = require('./helpers');

describe('v1 - node POST', () => {
	const state = {};

	setupMocks(state);

	const cleanUp = async () => {
		await db.run(`MATCH (n:System { code: "new-system" }) DETACH DELETE n`);
		await db.run(
			`MATCH (n:Person { code: "new-test-person" }) DETACH DELETE n`
		);
	};

	before(cleanUp);
	afterEach(cleanUp);

	it('create node', async () => {
		await request(app)
			.post('/v1/node/System/new-system')
			.auth()
			.set('x-request-id', 'create-request-id')
			.send({ node: { foo: 'new' } })
			.expect(200, {
				node: {
					code: 'new-system',
					foo: 'new'
				},
				relationships: []
			});
		const result = await db.run(
			`MATCH (n:System { code: "new-system" }) RETURN n`
		);
		expect(result.records.length).to.equal(1);
		const record = result.records[0];
		expect(record.get('n').properties).to.eql({
			createdByRequest: 'create-request-id',
			code: 'new-system',
			foo: 'new'
		});
		expect(record.get('n').labels).to.eql(['System']);
	});

	it('error when creating duplicate node', async () => {
		await request(app)
			.post('/v1/node/System/test-system')
			.auth()
			.send({ node: { foo: 'new-again' } })
			.expect(409, 'System test-system already exists. Choose another code name.');
	});

	it('error when conflicting code values', async () => {
		await request(app)
			.post('/v1/node/System/new-system')
			.auth()
			.send({ node: { foo: 'new', code: 'wrong-code' } })
			.expect(
				400,
				'Conflicting code attribute `wrong-code` for System new-system'
			);
	});

	it('not error when non-conflicting code values', async () => {
		await request(app)
			.post('/v1/node/System/new-system')
			.auth()
			.send({ node: { foo: 'new', code: 'new-system' } })
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
			OWNS: [
				{
					direction: 'incoming',
					nodeType: 'Group',
					nodeCode: 'test-group'
				}
			]
		};
		await request(app)
			.post('/v1/node/System/new-system')
			.auth()
			.set('x-request-id', 'create-request-id')
			.send({
				node: { foo: 'new' },
				relationships
			})
			.expect(200)
			.then(({ body }) =>
				checkResponse(body, {
					node: {
						code: 'new-system',
						foo: 'new'
					},
					relationships
				})
			);

		const result = await db.run(
			`MATCH (n:System { code: "new-system" })-[r]-(c) RETURN n, r, c`
		);

		expect(result.records.length).to.equal(2);

		expect(result.records[0].get('n').properties).to.eql({
			createdByRequest: 'create-request-id',
			code: 'new-system',
			foo: 'new'
		});

		const [person, group] =
			result.records[0].get('c').labels[0] === 'Person'
				? result.records
				: result.records.slice().reverse();

		expect(group.get('r').properties).to.eql({
			createdByRequest: 'create-request-id'
		});
		expect(group.get('c').properties.createdByRequest).to.not.exist;
		expect(group.get('c').properties).to.eql({
			foo: 'bar3',
			code: 'test-group'
		});

		expect(person.get('r').properties).to.eql({
			createdByRequest: 'create-request-id'
		});
		expect(person.get('c').properties.createdByRequest).to.not.exist;
		expect(person.get('c').properties).to.eql({
			foo: 'bar2',
			code: 'test-person'
		});
	});

	it('error when creating node related to non-existent nodes', async () => {
		await request(app)
			.post('/v1/node/System/new-system')
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
			.post('/v1/node/System/new-system?upsert=true')
			.auth()
			.set('x-request-id', 'create-request-id')
			.send({
				node: { foo: 'new' },
				relationships
			})
			.expect(200)
			.then(({ body }) =>
				checkResponse(body, {
					node: {
						code: 'new-system',
						foo: 'new'
					},
					relationships
				})
			);
		const result = await db.run(
			`MATCH (n:System { code: "new-system" })-[r]-(c) RETURN n, r, c`
		);
		expect(result.records.length).to.equal(1);
		const record0 = result.records[0];

		expect(record0.get('n').properties).to.eql({
			createdByRequest: 'create-request-id',
			code: 'new-system',
			foo: 'new'
		});
		expect(record0.get('r').properties).to.eql({
			createdByRequest: 'create-request-id'
		});
		expect(record0.get('c').properties).to.eql({
			code: 'new-test-person',
			createdByRequest: 'create-request-id'
		});
	});

	it('not set `createdByRequest` on things that already existed when using `upsert=true`', async () => {
		await request(app)
			.post('/v1/node/System/new-system?upsert=true')
			.auth()
			.set('x-request-id', 'create-request-id')
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
			`MATCH (n:System { code: "new-system" })-[r]-(c) RETURN n, r, c`
		);
		expect(result.records.length).to.equal(1);
		const record0 = result.records[0];
		expect(record0.get('n').properties).to.eql({
			createdByRequest: 'create-request-id',
			code: 'new-system',
			foo: 'new'
		});
		expect(record0.get('r').properties).to.eql({
			createdByRequest: 'create-request-id'
		});
		expect(record0.get('c').properties.createdByRequest).to.not.exist;
		expect(record0.get('c').properties).to.eql({
			foo: 'bar2',
			code: 'test-person'
		});
	});

	it('responds with 500 if query fails', async () => {
		state.sandbox.stub(db, 'run').throws('oh no');
		return request(app)
			.post('/v1/node/System/new-system')
			.auth()
			.send({
				node: { foo: 'new' }
			})
			.expect(500);
	});

	it('has case insensitive url and relationship configs', async () => {
		await request(app)
			.post('/v1/node/sysTem/New-sYStem')
			.auth()
			.set('x-request-id', 'create-request-id')
			.send({
				node: { foo: 'new', code: 'New-sYStem' },
				relationships: {
					hAS_TeCH_LEAD: [
						{
							direction: 'outgoing',
							nodeType: 'peRson',
							nodeCode: 'TesT-peRSOn'
						}
					]
				}
			})
			.expect(200)
			.then(({ body }) =>
				checkResponse(body, {
					node: {
						code: 'new-system',
						foo: 'new'
					},
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
			);
	});

	it('logs creation events to kinesis', async () => {
		await request(app)
			.post('/v1/node/System/new-system?upsert=true')
			.auth()
			.set('x-request-id', 'create-request-id')
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
					OWNS: [
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
					code: 'new-system',
					type: 'System',
					requestId: 'create-request-id'
				}
			],
			[
				{
					event: 'CREATED_NODE',
					action: 'CREATE',
					code: 'new-test-person',
					type: 'Person',
					requestId: 'create-request-id'
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
					code: 'new-system',
					type: 'System',
					requestId: 'create-request-id'
				}
			],
			[
				{
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TECH_LEAD',
						direction: 'incoming',
						nodeCode: 'new-system',
						nodeType: 'System'
					},
					code: 'new-test-person',
					type: 'Person',
					requestId: 'create-request-id'
				}
			],
			[
				{
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'OWNS',
						direction: 'incoming',
						nodeCode: 'test-group',
						nodeType: 'Group'
					},
					code: 'new-system',
					type: 'System',
					requestId: 'create-request-id'
				}
			],
			[
				{
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'OWNS',
						direction: 'outgoing',
						nodeCode: 'new-system',
						nodeType: 'System'
					},
					code: 'test-group',
					type: 'Group',
					requestId: 'create-request-id'
				}
			]
		].map(args => expect(state.stubSendEvent).calledWith(...args));

		return db.run('MATCH (g:Person {code: "new-test-person"}) DETACH DELETE g');
	});
});

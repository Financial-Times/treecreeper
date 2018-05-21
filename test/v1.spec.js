const logger = require('@financial-times/n-logger').default;
const sinon = require('sinon');
const { expect } = require('chai');
const request = require('./helpers/supertest');
const app = require('../server/app.js');
const { session: db } = require('../server/db-connection');
const EventLogWriter = require('../server/lib/event-log-writer');
const API_KEY = process.env.API_KEY;

const checkResponse = (actual, expected) => {
	expect(actual.node).to.eql(expected.node);
	if (expected.relationships) {
		expect(actual.relationships).to.have.deep.members(expected.relationships);
	} else {
		expect(actual.relationships).to.not.exist;
	}
};

describe('v1', () => {
	let sandbox;
	let stubSendEvent;

	beforeEach(() => {
		sandbox = sinon.sandbox.create();
		stubSendEvent = sandbox
			.stub(EventLogWriter.prototype, 'sendEvent')
			.callsFake(data => {
				logger.debug('Event log stub sendEvent called', { event: data.event });
				return Promise.resolve();
			});
	});

	afterEach(() => {
		sandbox.restore();
	});

	describe.skip('auth', () => {
		it('GET no api_key returns 400', () => {
			request(app)
				.get('/api/SomeNodeType/SomeUniqueAttr/SomeUniqueAttrValue')
				.expect(400);
		});
	});

	describe('node', () => {
		const nodes = Object.freeze([
			Object.freeze({
				type: 'System',
				node: Object.freeze({
					id: 'test-system',
					foo: 'bar1'
				})
			}),
			Object.freeze({
				type: 'Person',
				node: Object.freeze({
					id: 'test-person',
					foo: 'bar2'
				})
			}),
			Object.freeze({
				type: 'Group',
				node: Object.freeze({
					id: 'test-group',
					foo: 'bar3'
				})
			})
		]);

		const cleanUp = async () => {
			await Promise.all(
				nodes.map(async ({ type, node }) => {
					await db.run(
						`MATCH (n:${type} { id: "${node.id}" }) DETACH DELETE n`
					);
				})
			);
		};
		beforeEach(cleanUp);
		beforeEach(() =>
			Promise.all(
				nodes.map(({ type, node }) =>
					db.run(`CREATE (n:${type} $node) RETURN n`, { node })
				)
			));

		after(cleanUp);

		describe('GET', () => {
			it('gets node without relationships', async () => {
				return request(app)
					.get('/v1/node/System/test-system')
					.set('API_KEY', API_KEY)
					.expect(200, { node: nodes[0].node, relationships: [] });
			});

			it('gets node with relationships', async () => {
				// create the relationship
				await db.run(`MATCH (s:System { id: "test-system" }), (p:Person { id: "test-person" }), (g:Group { id: "test-group" })
											MERGE (g)-[o:OWNS]->(s)-[t:HAS_TECH_LEAD]->(p)
											RETURN g, o, s, t, p`);
				return request(app)
					.get('/v1/node/System/test-system')
					.set('API_KEY', API_KEY)
					.expect(200)
					.then(({ body }) =>
						checkResponse(body, {
							node: nodes[0].node,
							relationships: [
								{
									relType: 'HAS_TECH_LEAD',
									direction: 'outgoing',
									nodeType: 'Person',
									nodeCode: 'test-person'
								},
								{
									relType: 'OWNS',
									direction: 'incoming',
									nodeType: 'Group',
									nodeCode: 'test-group'
								}
							]
						})
					);
			});

			it('responds with 404 if no node', async () => {
				return request(app)
					.get('/v1/node/System/not-test-system')
					.set('API_KEY', API_KEY)
					.expect(404);
			});

			it('responds with 500 if query fails', async () => {
				sandbox.stub(db, 'run').throws('oh no');
				return request(app)
					.get('/v1/node/System/test-system')
					.set('API_KEY', API_KEY)
					.expect(500);
			});

			it('has case insensitive url', async () => {
				return request(app)
					.get('/v1/node/system/tEst-SYstem')
					.set('API_KEY', API_KEY)
					.expect(200);
			});
		});

		describe('POST', () => {
			const cleanUp = async () => {
				await Promise.all(
					nodes.map(async () => {
						await db.run(
							`MATCH (n:System { id: "new-system" }) DETACH DELETE n`
						);
						await db.run(
							`MATCH (n:Person { id: "new-test-person" }) DETACH DELETE n`
						);
					})
				);
			};

			beforeEach(cleanUp);
			after(cleanUp);

			it('create node', async () => {
				await request(app)
					.post('/v1/node/System/new-system')
					.set('API_KEY', API_KEY)
					.set('x-request-id', 'create-request-id')
					.send({ node: { foo: 'new' } })
					.expect(200, {
						node: {
							id: 'new-system',
							foo: 'new'
						},
						relationships: []
					});
				const result = await db.run(
					`MATCH (n:System { id: "new-system" }) RETURN n`
				);
				expect(result.records.length).to.equal(1);
				const record = result.records[0];
				expect(record.get('n').properties).to.eql({
					createdByRequest: 'create-request-id',
					id: 'new-system',
					foo: 'new'
				});
				expect(record.get('n').labels).to.eql(['System']);
			});

			it('error when creating duplicate node', async () => {
				await request(app)
					.post('/v1/node/System/test-system')
					.set('API_KEY', API_KEY)
					.send({ node: { foo: 'new' } })
					.expect(409, 'System test-system already exists');
			});

			it('error when conflicting id values', async () => {
				await request(app)
					.post('/v1/node/System/new-system')
					.set('API_KEY', API_KEY)
					.send({ node: { foo: 'new', id: 'wrong-id' } })
					.expect(
						400,
						'Conflicting id attribute `wrong-id` for System new-system'
					);
			});

			it('not error when non-conflicting id values', async () => {
				await request(app)
					.post('/v1/node/System/new-system')
					.set('API_KEY', API_KEY)
					.send({ node: { foo: 'new', id: 'new-system' } })
					.expect(200);
			});

			it('create node related to existing nodes', async () => {
				await request(app)
					.post('/v1/node/System/new-system')
					.set('API_KEY', API_KEY)
					.set('x-request-id', 'create-request-id')
					.send({
						node: { foo: 'new' },
						relationships: [
							{
								relType: 'HAS_TECH_LEAD',
								direction: 'outgoing',
								nodeType: 'Person',
								nodeCode: 'test-person'
							},
							{
								relType: 'OWNS',
								direction: 'incoming',
								nodeType: 'Group',
								nodeCode: 'test-group'
							}
						]
					})
					.expect(200)
					.then(({ body }) =>
						checkResponse(body, {
							node: {
								id: 'new-system',
								foo: 'new'
							},
							relationships: [
								{
									relType: 'HAS_TECH_LEAD',
									direction: 'outgoing',
									nodeType: 'Person',
									nodeCode: 'test-person'
								},
								{
									relType: 'OWNS',
									direction: 'incoming',
									nodeType: 'Group',
									nodeCode: 'test-group'
								}
							]
						})
					);
				const result = await db.run(
					`MATCH (n:System { id: "new-system" })-[r]-(c) RETURN n, r, c`
				);

				expect(result.records.length).to.equal(2);

				const [person, group] =
					result.records[0].get('c').labels[0] === 'Person'
						? result.records
						: result.records.slice().reverse();

				expect(group.get('n').properties).to.eql({
					createdByRequest: 'create-request-id',
					id: 'new-system',
					foo: 'new'
				});
				expect(group.get('r').properties).to.eql({
					createdByRequest: 'create-request-id'
				});
				expect(group.get('c').properties.createdByRequest).to.not.exist;
				expect(group.get('c').properties).to.eql({
					foo: 'bar3',
					id: 'test-group'
				});
				expect(group.get('c').labels).to.eql(['Group']);
				expect(person.get('n').properties).to.eql({
					createdByRequest: 'create-request-id',
					id: 'new-system',
					foo: 'new'
				});
				expect(person.get('r').properties).to.eql({
					createdByRequest: 'create-request-id'
				});
				expect(person.get('c').properties.createdByRequest).to.not.exist;
				expect(person.get('c').properties).to.eql({
					foo: 'bar2',
					id: 'test-person'
				});
				expect(person.get('c').labels).to.eql(['Person']);
			});

			it('error when creating node related to non-existent nodes', async () => {
				await request(app)
					.post('/v1/node/System/new-system')
					.set('API_KEY', API_KEY)
					.set('x-request-id', 'create-request-id')
					.send({
						node: { foo: 'new' },
						relationships: [
							{
								relType: 'HAS_TECH_LEAD',
								direction: 'outgoing',
								nodeType: 'Person',
								nodeCode: 'new-test-person'
							}
						]
					})
					.expect(400, /Missing related node Person new-test-person/);
			});

			it('create node related to non-existent nodes when using upsert=true', async () => {
				await request(app)
					.post('/v1/node/System/new-system?upsert=true')
					.set('API_KEY', API_KEY)
					.set('x-request-id', 'create-request-id')
					.send({
						node: { foo: 'new' },
						relationships: [
							{
								relType: 'HAS_TECH_LEAD',
								direction: 'outgoing',
								nodeType: 'Person',
								nodeCode: 'new-test-person'
							}
						]
					})
					.expect(200)
					.then(({ body }) =>
						checkResponse(body, {
							node: {
								id: 'new-system',
								foo: 'new'
							},
							relationships: [
								{
									relType: 'HAS_TECH_LEAD',
									direction: 'outgoing',
									nodeType: 'Person',
									nodeCode: 'new-test-person'
								}
							]
						})
					);
				const result = await db.run(
					`MATCH (n:System { id: "new-system" })-[r]-(c) RETURN n, r, c`
				);
				expect(result.records.length).to.equal(1);
				const record0 = result.records[0];
				expect(record0.get('n').properties).to.eql({
					createdByRequest: 'create-request-id',
					id: 'new-system',
					foo: 'new'
				});
				expect(record0.get('r').properties).to.eql({
					createdByRequest: 'create-request-id'
				});
				expect(record0.get('c').properties).to.eql({
					id: 'new-test-person',
					createdByRequest: 'create-request-id'
				});
				expect(record0.get('c').labels).to.eql(['Person']);
			});

			it('not assume it created everything when using `upsert=true`', async () => {
				await request(app)
					.post('/v1/node/System/new-system?upsert=true')
					.set('API_KEY', API_KEY)
					.set('x-request-id', 'create-request-id')
					.send({
						node: { foo: 'new' },
						relationships: [
							{
								relType: 'HAS_TECH_LEAD',
								direction: 'outgoing',
								nodeType: 'Person',
								nodeCode: 'test-person'
							}
						]
					})
					.expect(200);

				const result = await db.run(
					`MATCH (n:System { id: "new-system" })-[r]-(c) RETURN n, r, c`
				);
				expect(result.records.length).to.equal(1);
				const record0 = result.records[0];
				expect(record0.get('n').properties).to.eql({
					createdByRequest: 'create-request-id',
					id: 'new-system',
					foo: 'new'
				});
				expect(record0.get('r').properties).to.eql({
					createdByRequest: 'create-request-id'
				});
				expect(record0.get('c').properties.createdByRequest).to.not.exist;
				expect(record0.get('c').properties).to.eql({
					foo: 'bar2',
					id: 'test-person'
				});
				expect(record0.get('c').labels).to.eql(['Person']);
			});

			it('responds with 500 if query fails', async () => {
				sandbox.stub(db, 'run').throws('oh no');
				return request(app)
					.post('/v1/node/System/new-system')
					.set('API_KEY', API_KEY)
					.send({
						node: { foo: 'new' }
					})
					.expect(500);
			});

			it('has case insensitive url and relationship configs', async () => {
				await request(app)
					.post('/v1/node/sysTem/New-sYStem')
					.set('API_KEY', API_KEY)
					.set('x-request-id', 'create-request-id')
					.send({
						node: { foo: 'new' },
						relationships: [
							{
								relType: 'HAS_TECH_LEAD',
								direction: 'outgoing',
								nodeType: 'peRson',
								nodeCode: 'TesT-peRSOn'
							}
						]
					})
					.expect(200)
					.then(({ body }) =>
						checkResponse(body, {
							node: {
								id: 'new-system',
								foo: 'new'
							},
							relationships: [
								{
									relType: 'HAS_TECH_LEAD',
									direction: 'outgoing',
									nodeType: 'Person',
									nodeCode: 'test-person'
								}
							]
						})
					);
			});

			it('logs creation events to kinesis', async () => {
				await request(app)
					.post('/v1/node/System/new-system?upsert=true')
					.set('API_KEY', API_KEY)
					.set('x-request-id', 'create-request-id')
					.send({
						// create a node
						node: { foo: 'new' },
						relationships: [
							{
								// connect to new node
								relType: 'HAS_TECH_LEAD',
								direction: 'outgoing',
								nodeType: 'Person',
								nodeCode: 'new-test-person'
							},
							{
								//connect to existing node
								relType: 'OWNS',
								direction: 'incoming',
								nodeType: 'Group',
								nodeCode: 'test-group'
							}
						]
					});

				[
					[
						{
							event: 'CREATED_NODE',
							action: 'CREATE',
							code: 'new-system',
							type: 'System'
						}
					],
					[
						{
							event: 'CREATED_NODE',
							action: 'CREATE',
							code: 'new-test-person',
							type: 'Person'
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
							type: 'System'
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
							type: 'Person'
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
							type: 'System'
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
							type: 'Group'
						}
					]
				].map(args => expect(stubSendEvent).calledWith(...args));
			});
		});

		describe('PATCH', () => {
			const cleanUp = async () => {
				await Promise.all(
					nodes.map(async () => {
						await db.run(
							`MATCH (n:Person { id: "new-test-person" }) DETACH DELETE n`
						);
					})
				);
			};

			beforeEach(cleanUp);
			after(cleanUp);

			it('update node', async () => {
				await request(app)
					.patch('/v1/node/System/test-system')
					.set('API_KEY', API_KEY)
					.set('x-request-id', 'update-request-id')
					.send({ node: { foo: 'updated' } })
					.expect(200, {
						node: {
							foo: 'updated',
							id: 'test-system'
						},
						relationships: []
					});

				const result = await db.run(
					`MATCH (n:System { id: "test-system" }) RETURN n`
				);
				expect(result.records.length).to.equal(1);
				const record = result.records[0];
				expect(record.get('n').properties.createdByRequest).not.to.equal(
					'update-request-id'
				);
				expect(record.get('n').properties.foo).to.equal('updated');
			});

			it('Create when patching non-existent node', async () => {
				await request(app)
					.patch('/v1/node/System/new-system')
					.set('API_KEY', API_KEY)
					.set('x-request-id', 'update-request-id')
					.send({ node: { foo: 'new' } })
					.expect(201, {
						node: {
							id: 'new-system',
							foo: 'new'
						},
						relationships: []
					});
				const result = await db.run(
					`MATCH (n:System { id: "new-system" }) RETURN n`
				);
				expect(result.records.length).to.equal(1);
				const record = result.records[0];
				expect(record.get('n').properties).to.eql({
					createdByRequest: 'update-request-id',
					id: 'new-system',
					foo: 'new'
				});
				expect(record.get('n').labels).to.eql(['System']);
			});

			it('error when conflicting id values', async () => {
				await request(app)
					.patch('/v1/node/System/test-system')
					.set('API_KEY', API_KEY)
					.send({ node: { foo: 'updated', id: 'wrong-id' } })
					.expect(
						400,
						'Conflicting id attribute `wrong-id` for System test-system'
					);
			});

			it('not error when non-conflicting id values', async () => {
				await request(app)
					.patch('/v1/node/System/test-system')
					.set('API_KEY', API_KEY)
					.send({ node: { foo: 'updated', id: 'test-system' } })
					.expect(200);
			});

			it('responds with 500 if query fails', async () => {
				sandbox.stub(db, 'run').throws('oh no');
				return request(app)
					.patch('/v1/node/System/test-system')
					.set('API_KEY', API_KEY)
					.send({
						node: { foo: 'updated' }
					})
					.expect(500);
			});

			it('has case insensitive url and relationship configs', async () => {
				await request(app)
					.patch('/v1/node/sysTem/Test-sYStem')
					.set('API_KEY', API_KEY)
					.set('x-request-id', 'create-request-id')
					.send({
						node: { foo: 'updated' }
						// relationships: [
						// 	{
						// 		relType: 'HAS_TECH_LEAD',
						// 		direction: 'outgoing',
						// 		nodeType: 'peRson',
						// 		nodeCode: 'TesT-peRSOn'
						// 	}
						// ]
					})
					.expect(200)
					.then(({ body }) =>
						checkResponse(body, {
							node: {
								id: 'test-system',
								foo: 'updated'
							},
							relationships: []
							// 	{
							// 		relType: 'HAS_TECH_LEAD',
							// 		direction: 'outgoing',
							// 		nodeType: 'Person',
							// 		nodeCode: 'test-person'
							// 	}
							// ]
						})
					);
			});

			it('logs creation events to kinesis', async () => {
				await request(app)
					.patch('/v1/node/System/test-system?upsert=true')
					.set('API_KEY', API_KEY)
					.set('x-request-id', 'create-request-id')
					.send({
						// create a node
						node: { foo: 'updated' }
						// relationships: [
						// 	{
						// 		// connect to new node
						// 		relType: 'HAS_TECH_LEAD',
						// 		direction: 'outgoing',
						// 		nodeType: 'Person',
						// 		nodeCode: 'new-test-person'
						// 	},
						// 	{
						// 		//connect to existing node
						// 		relType: 'OWNS',
						// 		direction: 'incoming',
						// 		nodeType: 'Group',
						// 		nodeCode: 'test-group'
						// 	}
						// ]
					});

				[
					[
						{
							event: 'UPDATED_NODE',
							action: 'CREATE',
							code: 'test-system',
							type: 'System'
						}
					]
				].map(args => expect(stubSendEvent).calledWith(...args));
			});
		});
	});
});

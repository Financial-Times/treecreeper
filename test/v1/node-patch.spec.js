const { expect } = require('chai');
const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { session: db } = require('../../server/db-connection');
const { checkResponse, setupMocks } = require('./helpers');

describe('v1 - node PATCH', () => {
	const state = {};

	setupMocks(state);

	const cleanUp = async () => {
		await db.run(
			`MATCH (n:Person { id: "other-test-person" }) DETACH DELETE n`
		);
	};

	before(cleanUp);
	afterEach(cleanUp);

	it('update node', async () => {
		await request(app)
			.patch('/v1/node/System/test-system')
			.auth()
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
			.auth()
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
			.auth()
			.send({ node: { foo: 'updated', id: 'wrong-id' } })
			.expect(
				400,
				'Conflicting id attribute `wrong-id` for System test-system'
			);
	});

	it('not error when non-conflicting id values', async () => {
		await request(app)
			.patch('/v1/node/System/test-system')
			.auth()
			.send({ node: { foo: 'updated', id: 'test-system' } })
			.expect(200);
	});

	it('responds with 500 if query fails', async () => {
		state.sandbox.stub(db, 'run').throws('oh no');
		return request(app)
			.patch('/v1/node/System/test-system')
			.auth()
			.send({
				node: { foo: 'updated' }
			})
			.expect(500);
	});

	it("deletes attributes which are provided as 'null'", async () => {
		await request(app)
			.patch('/v1/node/System/test-system')
			.auth()
			.set('x-request-id', 'update-request-id')
			.send({ node: { foo: null } })
			.expect(200, {
				node: {
					id: 'test-system'
				},
				relationships: []
			});

		const result = await db.run(
			`MATCH (n:System { id: "test-system" }) RETURN n`
		);
		expect(result.records.length).to.equal(1);
		const record = result.records[0];
		expect(record.get('n').properties.foo).to.not.exist;
	});

	describe('relationship patching', () => {
		const cleanUp = () =>
			db.run(`MATCH (p:Person {id: 'other-test-person'}) DETACH DELETE p`);
		beforeEach(cleanUp);
		after(cleanUp);

		it('errors if updating relationships without relationshipAction query string', async () => {
			await request(app)
				.patch('/v1/node/System/test-system')
				.auth()
				.set('x-request-id', 'update-request-id')
				.send({
					relationships: {
						HAS_TECH_LEAD: [
							{
								direction: 'outgoing',
								nodeCode: 'test-person',
								nodeType: 'Person'
							}
						]
					}
				})
				.expect(
					400,
					'PATCHing relationships requires a relationshipAction query param set to `append` or `replace`'
				);

			const result = await db.run(
				`MATCH (s:System {id: 'test-system'})-[]-() RETURN s`
			);
			// i.e. no relationships created
			expect(result.records.length).to.equal(0);
		});

		it('can append to empty relationship set if relationshipAction=append', async () => {
			const relationships = {
				HAS_TECH_LEAD: [
					{
						direction: 'outgoing',
						nodeCode: 'test-person',
						nodeType: 'Person'
					}
				]
			};
			await request(app)
				.patch('/v1/node/System/test-system?relationshipAction=append')
				.auth()
				.set('x-request-id', 'update-request-id')
				.send({
					relationships
				})
				.expect(200)
				.then(({ body }) =>
					checkResponse(body, {
						node: {
							id: 'test-system',
							foo: 'bar1'
						},
						relationships
					})
				);

			const result = await db.run(
				`MATCH (s:System {id: "test-system"})-[r]-(c) RETURN s, r, c`
			);
			expect(result.records.length).to.equal(1);
			const record0 = result.records[0];
			expect(record0.get('r').properties).to.eql({
				createdByRequest: 'update-request-id'
			});
			expect(record0.get('c').properties.createdByRequest).to.not.exist;
			expect(record0.get('c').properties).to.eql({
				foo: 'bar2',
				id: 'test-person'
			});
		});

		it('can append to relationships if relationshipAction=append', async () => {
			await db.run(
				`CREATE (p:Person { id: "other-test-person" })
			WITH p
			MATCH (s: System {id: "test-system"})
			MERGE (s)-[:HAS_TECH_LEAD]->(p)
			RETURN s, p
			`
			);
			await request(app)
				.patch('/v1/node/System/test-system?relationshipAction=append')
				.auth()
				.set('x-request-id', 'update-request-id')
				.send({
					relationships: {
						HAS_TECH_LEAD: [
							{
								direction: 'outgoing',
								nodeCode: 'test-person',
								nodeType: 'Person'
							}
						]
					}
				})
				.expect(200)
				.then(({ body }) =>
					checkResponse(body, {
						node: {
							id: 'test-system',
							foo: 'bar1'
						},
						relationships: {
							HAS_TECH_LEAD: [
								{
									direction: 'outgoing',
									nodeCode: 'other-test-person',
									nodeType: 'Person'
								},
								{
									direction: 'outgoing',
									nodeCode: 'test-person',
									nodeType: 'Person'
								}
							]
						}
					})
				);
			const result = await db.run(
				`MATCH (s:System {id: "test-system"})-[r]-(c) RETURN s, r, c`
			);
			expect(result.records.length).to.equal(2);

			const [existing, added] =
				result.records[0].get('c').properties.id === 'other-test-person'
					? result.records
					: result.records.slice().reverse();
			expect(existing.get('r').properties.createdByRequest).not.to.equal(
				'update-request-id'
			);
			expect(existing.get('c').properties.createdByRequest).to.not.exist;
			expect(existing.get('c').properties.id).to.equal('other-test-person');

			expect(added.get('r').properties.createdByRequest).to.equal(
				'update-request-id'
			);
			expect(added.get('c').properties.createdByRequest).to.not.exist;
			expect(added.get('c').properties.id).to.equal('test-person');
		});

		it('can replace an empty relationship set if relationshipAction=replace', async () => {
			await request(app)
				.patch('/v1/node/System/test-system?relationshipAction=replace')
				.auth()
				.set('x-request-id', 'update-request-id')
				.send({
					relationships: {
						HAS_TECH_LEAD: [
							{
								direction: 'outgoing',
								nodeCode: 'test-person',
								nodeType: 'Person'
							}
						]
					}
				})
				.expect(200)
				.then(({ body }) =>
					checkResponse(body, {
						node: {
							id: 'test-system',
							foo: 'bar1'
						},
						relationships: {
							HAS_TECH_LEAD: [
								{
									direction: 'outgoing',
									nodeCode: 'test-person',
									nodeType: 'Person'
								}
							]
						}
					})
				);

			const result = await db.run(
				`MATCH (s:System {id: "test-system"})-[r]-(c) RETURN s, r, c`
			);
			expect(result.records.length).to.equal(1);
			const record0 = result.records[0];
			expect(record0.get('r').properties).to.eql({
				createdByRequest: 'update-request-id'
			});
			expect(record0.get('c').properties.createdByRequest).to.not.exist;
			expect(record0.get('c').properties).to.eql({
				foo: 'bar2',
				id: 'test-person'
			});
		});

		it('can replace relationships if relationshipAction=replace', async () => {
			await db.run(
				`CREATE (p:Person { id: "other-test-person" })
			WITH p
			MATCH (s: System {id: "test-system"})
			MERGE (s)-[:HAS_TECH_LEAD]->(p)
			RETURN s, p
			`
			);
			await request(app)
				.patch('/v1/node/System/test-system?relationshipAction=replace')
				.auth()
				.set('x-request-id', 'update-request-id')
				.send({
					relationships: {
						HAS_TECH_LEAD: [
							{
								direction: 'outgoing',
								nodeCode: 'test-person',
								nodeType: 'Person'
							}
						]
					}
				})
				.expect(200)
				.then(({ body }) =>
					checkResponse(body, {
						node: {
							id: 'test-system',
							foo: 'bar1'
						},
						relationships: {
							HAS_TECH_LEAD: [
								{
									direction: 'outgoing',
									nodeCode: 'test-person',
									nodeType: 'Person'
								}
							]
						}
					})
				);

			const result = await db.run(
				`MATCH (s:System {id: "test-system"})-[r]-(c) RETURN s, r, c`
			);
			expect(result.records.length).to.equal(1);
			const record0 = result.records[0];
			expect(record0.get('r').properties).to.eql({
				createdByRequest: 'update-request-id'
			});
			expect(record0.get('c').properties.createdByRequest).to.not.exist;
			expect(record0.get('c').properties).to.eql({
				foo: 'bar2',
				id: 'test-person'
			});
		});

		it('leaves relationships of other types untouched when replacing', async () => {
			await db.run(
				`CREATE (p:Person { id: "other-test-person" })
			WITH p
			MATCH (s: System {id: "test-system"})
			MERGE (s)-[:HAS_TEAM_MEMBER]->(p)
			RETURN s, p
			`
			);
			await request(app)
				.patch('/v1/node/System/test-system?relationshipAction=replace')
				.auth()
				.set('x-request-id', 'update-request-id')
				.send({
					relationships: {
						HAS_TECH_LEAD: [
							{
								direction: 'outgoing',
								nodeCode: 'test-person',
								nodeType: 'Person'
							}
						]
					}
				})
				.expect(200)
				.then(({ body }) =>
					checkResponse(body, {
						node: {
							id: 'test-system',
							foo: 'bar1'
						},
						relationships: {
							HAS_TECH_LEAD: [
								{
									direction: 'outgoing',
									nodeCode: 'test-person',
									nodeType: 'Person'
								}
							],
							HAS_TEAM_MEMBER: [
								{
									direction: 'outgoing',
									nodeCode: 'other-test-person',
									nodeType: 'Person'
								}
							]
						}
					})
				);

			const result = await db.run(
				`MATCH (s:System {id: "test-system"})-[r]-(c) RETURN s, r, c`
			);
			expect(result.records.length).to.equal(2);
			expect(result.records.map(r => r.get('r').type)).to.have.members([
				'HAS_TECH_LEAD',
				'HAS_TEAM_MEMBER'
			]);
		});

		it('error when creating relationship to non-existent node', async () => {
			await request(app)
				.patch('/v1/node/System/test-system?relationshipAction=replace')
				.auth()
				.set('x-request-id', 'update-request-id')
				.send({
					relationships: {
						HAS_TECH_LEAD: [
							{
								direction: 'outgoing',
								nodeType: 'Person',
								nodeCode: 'other-test-person'
							}
						]
					}
				})
				.expect(400, /Missing related node Person other-test-person/);
		});

		it('create node related to non-existent nodes when using upsert=true & relationshipAction=append', async () => {
			const relationships = {
				HAS_TECH_LEAD: [
					{
						direction: 'outgoing',
						nodeType: 'Person',
						nodeCode: 'other-test-person'
					}
				]
			};

			await request(app)
				.patch(
					'/v1/node/System/test-system?relationshipAction=append&upsert=true'
				)
				.auth()
				.set('x-request-id', 'update-request-id')
				.send({
					relationships
				})
				.expect(200)
				.then(({ body }) =>
					checkResponse(body, {
						node: {
							id: 'test-system',
							foo: 'bar1'
						},
						relationships
					})
				);
			const result = await db.run(
				`MATCH (n:System { id: "test-system" })-[r]-(c) RETURN n, r, c`
			);
			expect(result.records.length).to.equal(1);
			const record0 = result.records[0];

			expect(record0.get('n').properties).to.eql({
				id: 'test-system',
				foo: 'bar1'
			});
			expect(record0.get('r').properties).to.eql({
				createdByRequest: 'update-request-id'
			});
			expect(record0.get('c').properties).to.eql({
				id: 'other-test-person',
				createdByRequest: 'update-request-id'
			});
		});

		it('create node related to non-existent nodes when using upsert=true & relationshipAction=replace', async () => {
			const relationships = {
				HAS_TECH_LEAD: [
					{
						direction: 'outgoing',
						nodeType: 'Person',
						nodeCode: 'other-test-person'
					}
				]
			};

			await request(app)
				.patch(
					'/v1/node/System/test-system?relationshipAction=replace&upsert=true'
				)
				.auth()
				.set('x-request-id', 'update-request-id')
				.send({
					relationships
				})
				.expect(200)
				.then(({ body }) =>
					checkResponse(body, {
						node: {
							id: 'test-system',
							foo: 'bar1'
						},
						relationships
					})
				);
			const result = await db.run(
				`MATCH (n:System { id: "test-system" })-[r]-(c) RETURN n, r, c`
			);
			expect(result.records.length).to.equal(1);
			const record0 = result.records[0];

			expect(record0.get('n').properties).to.eql({
				id: 'test-system',
				foo: 'bar1'
			});
			expect(record0.get('r').properties).to.eql({
				createdByRequest: 'update-request-id'
			});
			expect(record0.get('c').properties).to.eql({
				id: 'other-test-person',
				createdByRequest: 'update-request-id'
			});
		});
		it('not set `createdByRequest` on things that already existed when using `upsert=true`', async () => {
			await request(app)
				.patch(
					'/v1/node/System/test-system?upsert=true&relationshipAction=replace'
				)
				.auth()
				.set('x-request-id', 'update-request-id')
				.send({
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
				`MATCH (n:System { id: "test-system" })-[r]-(c) RETURN n, r, c`
			);
			expect(result.records[0].get('c').properties.createdByRequest).to.not
				.exist;
		});
	});

	it('responds with 500 if query fails', async () => {
		state.sandbox.stub(db, 'run').throws('oh no');
		return request(app)
			.patch('/v1/node/System/test-system')
			.auth()
			.send({
				node: { foo: 'new' }
			})
			.expect(500);
	});

	it('has case insensitive url and relationship configs', async () => {
		await request(app)
			.patch('/v1/node/sysTem/Test-sYStem?relationshipAction=replace')
			.auth()
			.set('x-request-id', 'create-request-id')
			.send({
				node: { foo: 'updated' },
				relationships: {
					HAS_TECH_LEAD: [
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
						id: 'test-system',
						foo: 'updated'
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

	it('logs modification events to kinesis', async () => {
		await db.run(
			`CREATE (p:Person { id: "other-test-person" })
			WITH p
			MATCH (s: System {id: "test-system"})
			MERGE (s)-[:HAS_TECH_LEAD]->(p)
			RETURN s, p
			`
		);
		await request(app)
			// we test with replace as this will delete some stuff too
			.patch(
				'/v1/node/System/test-system?upsert=true&relationshipAction=replace'
			)
			.auth()
			.set('x-request-id', 'update-request-id')
			.send({
				node: { foo: 'updated' },
				relationships: {
					OWNS: [
						{
							//connect to new node
							direction: 'incoming',
							nodeType: 'Group',
							nodeCode: 'new-test-group'
						}
					],
					HAS_TECH_LEAD: [
						{
							// replace with relationship to existing node
							direction: 'outgoing',
							nodeType: 'Person',
							nodeCode: 'test-person'
						}
					]
				}
			});

		[
			[
				{
					event: 'UPDATED_NODE',
					action: 'UPDATE',
					code: 'test-system',
					type: 'System',
					requestId: 'update-request-id'
				}
			],
			[
				{
					event: 'DELETED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TECH_LEAD',
						direction: 'outgoing',
						nodeCode: 'other-test-person',
						nodeType: 'Person'
					},
					code: 'test-system',
					type: 'System',
					requestId: 'update-request-id'
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
					code: 'other-test-person',
					type: 'Person',
					requestId: 'update-request-id'
				}
			],
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
					code: 'test-system',
					type: 'System',
					requestId: 'update-request-id'
				}
			],
			[
				{
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TECH_LEAD',
						direction: 'incoming',
						nodeCode: 'test-system',
						nodeType: 'System'
					},
					code: 'test-person',
					type: 'Person',
					requestId: 'update-request-id'
				}
			],
			[
				{
					event: 'CREATED_NODE',
					action: 'CREATE',
					code: 'new-test-group',
					type: 'Group',
					requestId: 'update-request-id'
				}
			],
			[
				{
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'OWNS',
						direction: 'incoming',
						nodeCode: 'new-test-group',
						nodeType: 'Group'
					},
					code: 'test-system',
					type: 'System',
					requestId: 'update-request-id'
				}
			],
			[
				{
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'OWNS',
						direction: 'outgoing',
						nodeCode: 'test-system',
						nodeType: 'System'
					},
					code: 'new-test-group',
					type: 'Group',
					requestId: 'update-request-id'
				}
			]
		].map(args => expect(state.stubSendEvent).calledWith(...args));
	});
});

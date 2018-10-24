const { expect } = require('chai');
const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { executeQuery } = require('../../server/data/db-connection');
const { checkResponse, setupMocks, stubDbUnavailable } = require('./helpers');
const lolex = require('lolex');

describe('v1 - node PATCH', () => {
	const state = {};

	setupMocks(state);
	let clock;
	const timestamp = 1528458548930;
	const formattedTimestamp = 'Fri, 08 Jun 2018 11:49:08 GMT';
	const cleanUp = async () => {
		await executeQuery(
			`MATCH (n:Person { code: "other-test-person" }) DETACH DELETE n`
		);
	};

	beforeEach(async () => {
		await cleanUp();
		clock = lolex.install({ now: timestamp });
	});
	afterEach(async () => {
		await cleanUp();
		clock.uninstall();
	});

	it('update node', async () => {
		await request(app)
			.patch('/v1/node/Team/test-team')
			.auth('update-client-id')
			.set('x-request-id', 'update-request-id')
			.send({
				node: {
					foo: 'updated'
				}
			})
			.expect(200, {
				node: {
					foo: 'updated',
					code: 'test-team',
					_updatedByRequest: 'update-request-id',
					_updatedByClient: 'update-client-id',
					_updatedTimestamp: formattedTimestamp
				},
				relationships: {}
			});

		const result = await executeQuery(
			`MATCH (n:Team { code: "test-team" }) RETURN n`
		);
		expect(result.records.length).to.equal(1);
		const record = result.records[0];
		expect(record.get('n').properties._createdByRequest).not.to.equal(
			'update-request-id'
		);
		expect(record.get('n').properties.foo).to.equal('updated');
	});

	it('Create when patching non-existent node', async () => {
		await request(app)
			.patch('/v1/node/Team/new-team')
			.auth('update-client-id')
			.set('x-request-id', 'update-request-id')
			.send({
				node: {
					foo: 'new'
				}
			})
			.expect(201, {
				node: {
					code: 'new-team',
					foo: 'new',
					_createdByRequest: 'update-request-id',
					_createdByClient: 'update-client-id',
					_createdTimestamp: formattedTimestamp,
					_updatedByRequest: 'update-request-id',
					_updatedByClient: 'update-client-id',
					_updatedTimestamp: formattedTimestamp
				},
				relationships: {}
			});
		const result = await executeQuery(
			`MATCH (n:Team { code: "new-team" }) RETURN n`
		);
		expect(result.records.length).to.equal(1);
		const record = result.records[0];
		expect(record.get('n').properties).to.eql({
			_createdByRequest: 'update-request-id',
			_createdByClient: 'update-client-id',
			_createdTimestamp: formattedTimestamp,
			_updatedByRequest: 'update-request-id',
			_updatedByClient: 'update-client-id',
			_updatedTimestamp: formattedTimestamp,
			code: 'new-team',
			foo: 'new'
		});
		expect(record.get('n').labels).to.eql(['Team']);
	});

	it('error when conflicting code values', async () => {
		await request(app)
			.patch('/v1/node/Team/test-team')
			.auth()
			.send({ node: { foo: 'updated', code: 'wrong-code' } })
			.expect(
				400,
				/Conflicting code attribute `wrong-code` for Team test-team/
			);
	});

	it('not error when non-conflicting code values', async () => {
		await request(app)
			.patch('/v1/node/Team/test-team')
			.auth()
			.send({ node: { foo: 'updated', code: 'test-team' } })
			.expect(200);
	});

	it('responds with 500 if query fails', async () => {
		stubDbUnavailable(state);
		return request(app)
			.patch('/v1/node/Team/test-team')
			.auth()
			.send({
				node: { foo: 'updated' }
			})
			.expect(500);
	});

	it("deletes attributes which are provided as 'null'", async () => {
		await request(app)
			.patch('/v1/node/Team/test-team')
			.auth('update-client-id')
			.set('x-request-id', 'update-request-id')
			.send({ node: { foo: null } })
			.expect(200, {
				node: {
					code: 'test-team',
					_updatedByRequest: 'update-request-id',
					_updatedByClient: 'update-client-id',
					_updatedTimestamp: formattedTimestamp
				},
				relationships: {}
			});

		const result = await executeQuery(
			`MATCH (n:Team { code: "test-team" }) RETURN n`
		);
		expect(result.records.length).to.equal(1);
		const record = result.records[0];
		expect(record.get('n').properties.foo).to.not.exist;
	});

	describe('relationship patching', () => {
		const cleanUp = () =>
			executeQuery(
				`MATCH (p:Person {code: 'other-test-person'}) DETACH DELETE p`
			);
		beforeEach(cleanUp);
		after(cleanUp);

		it('errors if updating relationships without relationshipAction query string', async () => {
			await request(app)
				.patch('/v1/node/Team/test-team')
				.auth('update-client-id')
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
					/PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`/
				);

			const result = await executeQuery(
				`MATCH (s:Team {code: 'test-team'})-[]-() RETURN s`
			);
			// i.e. no relationships created
			expect(result.records.length).to.equal(0);
		});

		it('can merge with empty relationship set if relationshipAction=merge', async () => {
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
				.patch('/v1/node/Team/test-team?relationshipAction=merge')
				.auth('update-client-id')
				.set('x-request-id', 'update-request-id')
				.send({
					relationships
				})
				.expect(200)
				.then(({ body }) =>
					checkResponse(body, {
						node: {
							code: 'test-team',
							foo: 'bar1',
							_updatedByClient: 'update-client-id',
							_updatedByRequest: 'update-request-id',
							_updatedTimestamp: formattedTimestamp
						},
						relationships
					})
				);

			const result = await executeQuery(
				`MATCH (s:Team {code: "test-team"})-[r]-(c) RETURN s, r, c`
			);
			expect(result.records.length).to.equal(1);
			const record0 = result.records[0];
			expect(record0.get('r').properties).to.eql({
				_createdByClient: 'update-client-id',
				_createdByRequest: 'update-request-id',
				_createdTimestamp: formattedTimestamp,
				_updatedByClient: 'update-client-id',
				_updatedByRequest: 'update-request-id',
				_updatedTimestamp: formattedTimestamp
			});
			expect(record0.get('c').properties._createdByRequest).to.not.exist;
			expect(record0.get('c').properties).to.eql({
				foo: 'bar2',
				code: 'test-person'
			});
		});

		it('can merge with relationships if relationshipAction=merge', async () => {
			await executeQuery(
				`CREATE (p:Person { code: "other-test-person" })
			WITH p
			MATCH (s: Team {code: "test-team"})
			MERGE (s)-[:HAS_TECH_LEAD]->(p)
			RETURN s, p
			`
			);
			await request(app)
				.patch('/v1/node/Team/test-team?relationshipAction=merge')
				.auth('update-client-id')
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
							code: 'test-team',
							foo: 'bar1',
							_updatedByClient: 'update-client-id',
							_updatedByRequest: 'update-request-id',
							_updatedTimestamp: formattedTimestamp
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
			const result = await executeQuery(
				`MATCH (s:Team {code: "test-team"})-[r]-(c) RETURN s, r, c`
			);
			expect(result.records.length).to.equal(2);

			const [existing, added] =
				result.records[0].get('c').properties.code === 'other-test-person'
					? result.records
					: result.records.slice().reverse();
			expect(existing.get('r').properties._createdByRequest).not.to.equal(
				'update-request-id'
			);
			expect(existing.get('c').properties._createdByRequest).to.not.exist;
			expect(existing.get('c').properties.code).to.equal('other-test-person');

			expect(added.get('r').properties._createdByRequest).to.equal(
				'update-request-id'
			);
			expect(added.get('c').properties._createdByRequest).to.not.exist;
			expect(added.get('c').properties.code).to.equal('test-person');
		});

		it('can replace an empty relationship set if relationshipAction=replace', async () => {
			await request(app)
				.patch('/v1/node/Team/test-team?relationshipAction=replace')
				.auth('update-client-id')
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
							code: 'test-team',
							foo: 'bar1',
							_updatedByClient: 'update-client-id',
							_updatedByRequest: 'update-request-id',
							_updatedTimestamp: formattedTimestamp
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

			const result = await executeQuery(
				`MATCH (s:Team {code: "test-team"})-[r]-(c) RETURN s, r, c`
			);
			expect(result.records.length).to.equal(1);
			const record0 = result.records[0];
			expect(record0.get('r').properties).to.eql({
				_createdByClient: 'update-client-id',
				_createdByRequest: 'update-request-id',
				_createdTimestamp: formattedTimestamp,
				_updatedByClient: 'update-client-id',
				_updatedByRequest: 'update-request-id',
				_updatedTimestamp: formattedTimestamp
			});
			expect(record0.get('c').properties._createdByRequest).to.not.exist;
			expect(record0.get('c').properties).to.eql({
				foo: 'bar2',
				code: 'test-person'
			});
		});

		it('can replace relationships if relationshipAction=replace', async () => {
			await executeQuery(
				`CREATE (p:Person { code: "other-test-person" })
			WITH p
			MATCH (s: Team {code: "test-team"})
			MERGE (s)-[:HAS_TECH_LEAD]->(p)
			RETURN s, p
			`
			);
			await request(app)
				.patch('/v1/node/Team/test-team?relationshipAction=replace')
				.auth('update-client-id')
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
							code: 'test-team',
							foo: 'bar1',
							_updatedByClient: 'update-client-id',
							_updatedByRequest: 'update-request-id',
							_updatedTimestamp: formattedTimestamp
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

			const result = await executeQuery(
				`MATCH (s:Team {code: "test-team"})-[r]-(c) RETURN s, r, c`
			);
			expect(result.records.length).to.equal(1);
			const record0 = result.records[0];
			expect(record0.get('r').properties).to.eql({
				_createdByClient: 'update-client-id',
				_createdByRequest: 'update-request-id',
				_createdTimestamp: formattedTimestamp,
				_updatedByClient: 'update-client-id',
				_updatedByRequest: 'update-request-id',
				_updatedTimestamp: formattedTimestamp
			});
			expect(record0.get('c').properties._createdByRequest).to.not.exist;
			expect(record0.get('c').properties).to.eql({
				foo: 'bar2',
				code: 'test-person'
			});
		});

		it('leaves relationships of other types untouched when replacing', async () => {
			await executeQuery(
				`CREATE (p:Person { code: "other-test-person" })
			WITH p
			MATCH (s: Team {code: "test-team"})
			MERGE (s)-[:HAS_TEAM_MEMBER]->(p)
			RETURN s, p
			`
			);
			await request(app)
				.patch('/v1/node/Team/test-team?relationshipAction=replace')
				.auth('update-client-id')
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
							code: 'test-team',
							foo: 'bar1',
							_updatedByClient: 'update-client-id',
							_updatedByRequest: 'update-request-id',
							_updatedTimestamp: formattedTimestamp
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

			const result = await executeQuery(
				`MATCH (s:Team {code: "test-team"})-[r]-(c) RETURN s, r, c`
			);
			expect(result.records.length).to.equal(2);
			expect(result.records.map(r => r.get('r').type)).to.have.members([
				'HAS_TECH_LEAD',
				'HAS_TEAM_MEMBER'
			]);
		});

		it('error when creating relationship to non-existent node', async () => {
			await request(app)
				.patch('/v1/node/Team/test-team?relationshipAction=replace')
				.auth('update-client-id')
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
				.expect(400, /Missing related node/);
		});

		it('create node related to non-existent nodes when using upsert=true & relationshipAction=merge', async () => {
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
				.patch('/v1/node/Team/test-team?relationshipAction=merge&upsert=true')
				.auth('update-client-id')
				.set('x-request-id', 'update-request-id')
				.send({
					relationships
				})
				.expect(200)
				.then(({ body }) =>
					checkResponse(body, {
						node: {
							code: 'test-team',
							foo: 'bar1',
							_updatedByClient: 'update-client-id',
							_updatedByRequest: 'update-request-id',
							_updatedTimestamp: formattedTimestamp
						},
						relationships
					})
				);
			const result = await executeQuery(
				`MATCH (n:Team { code: "test-team" })-[r]-(c) RETURN n, r, c`
			);
			expect(result.records.length).to.equal(1);
			const record0 = result.records[0];

			expect(record0.get('n').properties).to.eql({
				code: 'test-team',
				foo: 'bar1',
				_updatedByClient: 'update-client-id',
				_updatedByRequest: 'update-request-id',
				_updatedTimestamp: formattedTimestamp
			});
			expect(record0.get('r').properties).to.eql({
				_createdByClient: 'update-client-id',
				_createdByRequest: 'update-request-id',
				_createdTimestamp: formattedTimestamp,
				_updatedByClient: 'update-client-id',
				_updatedByRequest: 'update-request-id',
				_updatedTimestamp: formattedTimestamp
			});
			expect(record0.get('c').properties).to.eql({
				code: 'other-test-person',
				_createdByClient: 'update-client-id',
				_createdByRequest: 'update-request-id',
				_createdTimestamp: formattedTimestamp,
				_updatedByClient: 'update-client-id',
				_updatedByRequest: 'update-request-id',
				_updatedTimestamp: formattedTimestamp
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
				.patch('/v1/node/Team/test-team?relationshipAction=replace&upsert=true')
				.auth('update-client-id')
				.set('x-request-id', 'update-request-id')
				.send({
					relationships
				})
				.expect(200)
				.then(({ body }) =>
					checkResponse(body, {
						node: {
							code: 'test-team',
							foo: 'bar1',
							_updatedByClient: 'update-client-id',
							_updatedByRequest: 'update-request-id',
							_updatedTimestamp: formattedTimestamp
						},
						relationships
					})
				);
			const result = await executeQuery(
				`MATCH (n:Team { code: "test-team" })-[r]-(c) RETURN n, r, c`
			);
			expect(result.records.length).to.equal(1);
			const record0 = result.records[0];

			expect(record0.get('n').properties).to.eql({
				code: 'test-team',
				foo: 'bar1',
				_updatedByClient: 'update-client-id',
				_updatedByRequest: 'update-request-id',
				_updatedTimestamp: formattedTimestamp
			});
			expect(record0.get('r').properties).to.eql({
				_createdByClient: 'update-client-id',
				_createdByRequest: 'update-request-id',
				_createdTimestamp: formattedTimestamp,
				_updatedByClient: 'update-client-id',
				_updatedByRequest: 'update-request-id',
				_updatedTimestamp: formattedTimestamp
			});
			expect(record0.get('c').properties).to.eql({
				code: 'other-test-person',
				_createdByClient: 'update-client-id',
				_createdByRequest: 'update-request-id',
				_createdTimestamp: formattedTimestamp,
				_updatedByClient: 'update-client-id',
				_updatedByRequest: 'update-request-id',
				_updatedTimestamp: formattedTimestamp
			});
		});
		it('not set `createdByRequest` on things that already existed when using `upsert=true`', async () => {
			await request(app)
				.patch('/v1/node/Team/test-team?upsert=true&relationshipAction=replace')
				.auth('update-client-id')
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

			const result = await executeQuery(
				`MATCH (n:Team { code: "test-team" })-[r]-(c) RETURN n, r, c`
			);
			expect(result.records[0].get('c').properties._createdByRequest).to.not
				.exist;
		});
	});

	it('responds with 500 if query fails', async () => {
		stubDbUnavailable(state);
		return request(app)
			.patch('/v1/node/Team/test-team')
			.auth()
			.send({
				node: { foo: 'new' }
			})
			.expect(500);
	});

	it('logs modification events to kinesis', async () => {
		await executeQuery(
			`CREATE (p:Person { code: "other-test-person" })
			WITH p
			MATCH (s: Team {code: "test-team"})
			MERGE (s)-[:HAS_TECH_LEAD]->(p)
			RETURN s, p
			`
		);
		await request(app)
			// we test with replace as this will delete some stuff too
			.patch('/v1/node/Team/test-team?upsert=true&relationshipAction=replace')
			.auth('update-client-id')
			.set('x-request-id', 'update-request-id')
			.send({
				node: { foo: 'updated' },
				relationships: {
					HAS_TEAM: [
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
					code: 'test-team',
					type: 'Team',
					requestId: 'update-request-id',
					clientId: 'update-client-id'
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
					code: 'test-team',
					type: 'Team',
					requestId: 'update-request-id',
					clientId: 'update-client-id'
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
					code: 'other-test-person',
					type: 'Person',
					requestId: 'update-request-id',
					clientId: 'update-client-id'
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
					code: 'test-team',
					type: 'Team',
					requestId: 'update-request-id',
					clientId: 'update-client-id'
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
					requestId: 'update-request-id',
					clientId: 'update-client-id'
				}
			],
			[
				{
					event: 'CREATED_NODE',
					action: 'CREATE',
					code: 'new-test-group',
					type: 'Group',
					requestId: 'update-request-id',
					clientId: 'update-client-id'
				}
			],
			[
				{
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TEAM',
						direction: 'incoming',
						nodeCode: 'new-test-group',
						nodeType: 'Group'
					},
					code: 'test-team',
					type: 'Team',
					requestId: 'update-request-id',
					clientId: 'update-client-id'
				}
			],
			[
				{
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TEAM',
						direction: 'outgoing',
						nodeCode: 'test-team',
						nodeType: 'Team'
					},
					code: 'new-test-group',
					type: 'Group',
					requestId: 'update-request-id',
					clientId: 'update-client-id'
				}
			]
		].map(args => expect(state.stubSendEvent).calledWith(...args));

		return executeQuery(
			'MATCH (g:Group {code: "new-test-group"}) DETACH DELETE g'
		);
	});
});

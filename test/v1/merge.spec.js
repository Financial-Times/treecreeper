const { expect } = require('chai');
const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { setupMocks } = require('./helpers');
const { executeQuery } = require('../../server/data/db-connection');

const constructNode = codeOrNode =>
	typeof codeOrNode === 'object' ? codeOrNode : { code: codeOrNode };

const createNode = (type, code) =>
	executeQuery(`CREATE (n:${type} $node) RETURN n`, {
		node: constructNode(code)
	}).catch(() => null);

const mergeNode = (type, code) =>
	executeQuery(`MERGE (n:${type} {code: $code}) SET n = $node RETURN n`, {
		code: constructNode(code).code,
		node: constructNode(code)
	});

const deleteNode = (type, code) =>
	executeQuery(`MATCH (n:${type} {code: $code}) DETACH DELETE n`, { code });

const relateNodes = (
	relationship,
	[startType, startCode],
	[endType, endCode]
) =>
	executeQuery(`
MATCH (s:${startType} { code: "${startCode}" }), (e:${endType} { code: "${endCode}" })
MERGE (s)-[r:${relationship}]->(e)
RETURN s, r, e`);

describe('merge', () => {
	const state = {};

	setupMocks(state, { withDb: false });

	beforeEach(() =>
		Promise.all([createNode('Team', 'team1'), createNode('Team', 'team2')]));

	afterEach(() =>
		Promise.all([deleteNode('Team', 'team1'), deleteNode('Team', 'team2')]));
	describe('error handling', () => {
		it('errors if no type supplied', async () => {
			await request(app)
				.post('/v1/merge')
				.auth()
				.send({
					sourceCode: 'team1',
					destinationCode: 'team2'
				})
				.expect(400, /No type/);
		});

		it('errors if no source code supplied', async () => {
			await request(app)
				.post('/v1/merge')
				.auth()
				.send({
					type: 'Team',
					destinationCode: 'team2'
				})
				.expect(400, /No sourceCode/);
		});
		it('errors if no destination code supplied', async () => {
			await request(app)
				.post('/v1/merge')
				.auth()
				.send({
					type: 'Team',
					sourceCode: 'team1'
				})
				.expect(400, /No destinationCode/);
		});
		it('errors if type invalid', async () => {
			await request(app)
				.post('/v1/merge')
				.auth()
				.send({
					type: 'NotTeam',
					sourceCode: 'team1',
					destinationCode: 'team2'
				})
				.expect(400, /Invalid node type/);
		});

		it('errors if source code does not exist', async () => {
			await request(app)
				.post('/v1/merge')
				.auth()
				.send({
					type: 'Team',
					sourceCode: 'not-team1',
					destinationCode: 'team2'
				})
				.expect(404, /record missing/);
		});
		it('errors if destination code does not exist', async () => {
			await request(app)
				.post('/v1/merge')
				.auth()
				.send({
					type: 'Team',
					sourceCode: 'team1',
					destinationCode: 'not-team2'
				})
				.expect(404, /record missing/);
		});
	});
	describe('successful application', () => {
		it("'move' no relationships", async () => {
			await request(app)
				.post('/v1/merge')
				.auth()
				.send({
					type: 'Team',
					sourceCode: 'team1',
					destinationCode: 'team2'
				})
				.expect(200);
		});

		it('delete original node', async () => {
			await request(app)
				.post('/v1/merge')
				.auth()
				.send({
					type: 'Team',
					sourceCode: 'team1',
					destinationCode: 'team2'
				})
				.expect(200);
			const [team1, team2] = await Promise.all([
				executeQuery(`MATCH (s:Team { code: "team1" }) RETURN s`),
				executeQuery(`MATCH (s:Team { code: "team2" }) RETURN s`)
			]);

			expect(team1.records.length).to.equal(0);
			expect(team2.records.length).to.equal(1);
		});

		it('move outgoing relationships', async () => {
			await createNode('Person', 'person1');
			await relateNodes(
				'HAS_TECH_LEAD',
				['Team', 'team1'],
				['Person', 'person1']
			);
			await request(app)
				.post('/v1/merge')
				.auth()
				.send({
					type: 'Team',
					sourceCode: 'team1',
					destinationCode: 'team2'
				})
				.expect(200);

			const [team1, team2] = await Promise.all([
				executeQuery(
					`MATCH (s:Team { code: "team1" })-[r]->(e) RETURN s, r, e`
				),
				executeQuery(`MATCH (s:Team { code: "team2" })-[r]->(e) RETURN s, r, e`)
			]);
			expect(team1.records.length).to.equal(0);
			expect(team2.records.length).to.equal(1);

			const record = team2.records[0];

			expect(record.get('s').properties.code).to.equal('team2');
			expect(record.get('e').properties.code).to.equal('person1');
			expect(record.get('r').type).to.equal('HAS_TECH_LEAD');
			expect(record.get('r').start.equals(record.get('s').identity)).to.be.true;

			await deleteNode('Person', 'person1');
		});

		it('move incoming relationships', async () => {
			await createNode('Group', 'group1');
			await relateNodes('HAS_TEAM', ['Group', 'group1'], ['Team', 'team1']);
			await request(app)
				.post('/v1/merge')
				.auth()
				.send({
					type: 'Team',
					sourceCode: 'team1',
					destinationCode: 'team2'
				})
				.expect(200);

			const [team1, team2] = await Promise.all([
				executeQuery(
					`MATCH (s:Team { code: "team1" })<-[r]-(e) RETURN s, r, e`
				),
				executeQuery(`MATCH (s:Team { code: "team2" })<-[r]-(e) RETURN s, r, e`)
			]);
			expect(team1.records.length).to.equal(0);
			expect(team2.records.length).to.equal(1);

			const record = team2.records[0];

			expect(record.get('s').properties.code).to.equal('team2');
			expect(record.get('e').properties.code).to.equal('group1');
			expect(record.get('r').type).to.equal('HAS_TEAM');
			expect(record.get('r').start.equals(record.get('e').identity)).to.be.true;

			await deleteNode('Person', 'person1');
		});

		it('merges identical relationships', async () => {
			await createNode('Person', 'person1');
			await relateNodes(
				'HAS_TECH_LEAD',
				['Team', 'team1'],
				['Person', 'person1']
			);
			await relateNodes(
				'HAS_TECH_LEAD',
				['Team', 'team2'],
				['Person', 'person1']
			);
			await request(app)
				.post('/v1/merge')
				.auth()
				.send({
					type: 'Team',
					sourceCode: 'team1',
					destinationCode: 'team2'
				})
				.expect(200);

			const [team1, team2] = await Promise.all([
				executeQuery(
					`MATCH (s:Team { code: "team1" })-[r]->(e) RETURN s, r, e`
				),
				executeQuery(`MATCH (s:Team { code: "team2" })-[r]->(e) RETURN s, r, e`)
			]);
			expect(team1.records.length).to.equal(0);
			expect(team2.records.length).to.equal(1);

			const record = team2.records[0];

			expect(record.get('s').properties.code).to.equal('team2');
			expect(record.get('e').properties.code).to.equal('person1');
			expect(record.get('r').type).to.equal('HAS_TECH_LEAD');
			expect(record.get('r').start.equals(record.get('s').identity)).to.be.true;

			await deleteNode('Person', 'person1');
		});

		it('discard any newly reflexive relationships', async () => {
			await relateNodes('HAS_TEAM', ['Team', 'team1'], ['Team', 'team2']);
			await request(app)
				.post('/v1/merge')
				.auth()
				.send({
					type: 'Team',
					sourceCode: 'team1',
					destinationCode: 'team2'
				})
				.expect(200);

			const [team1, team2] = await Promise.all([
				executeQuery(
					`MATCH (s:Team { code: "team1" })-[r]->(e) RETURN s, r, e`
				),
				executeQuery(`MATCH (s:Team { code: "team2" })-[r]->(e) RETURN s, r, e`)
			]);
			expect(team1.records.length).to.equal(0);
			expect(team2.records.length).to.equal(0);
		});

		it('not modify properties of destination node', async () => {
			await createNode('Person', 'person1');
			await mergeNode('Team', { code: 'team1', foo: 'bar' });
			await mergeNode('Team', { code: 'team2', foo: 'baz' });
			await relateNodes(
				'HAS_TECH_LEAD',
				['Team', 'team1'],
				['Person', 'person1']
			);
			await request(app)
				.post('/v1/merge')
				.auth()
				.send({
					type: 'Team',
					sourceCode: 'team1',
					destinationCode: 'team2'
				})
				.expect(200);

			const team2 = await executeQuery(
				`MATCH (s:Team { code: "team2" }) RETURN s`
			);
			expect(team2.records[0].get('s').properties.foo).to.equal('baz');
		});

		it('log relationship changes and deletion to kinesis', async () => {
			await createNode('Group', 'group1');
			await createNode('Person', 'person1');
			await createNode('Person', 'person2');
			await relateNodes(
				'HAS_TECH_LEAD',
				['Team', 'team1'],
				['Person', 'person1']
			);
			await relateNodes(
				'HAS_PRODUCT_OWNER',
				['Team', 'team1'],
				['Person', 'person2']
			);
			await relateNodes(
				'HAS_PRODUCT_OWNER',
				['Team', 'team2'],
				['Person', 'person2']
			);
			await relateNodes('HAS_TEAM', ['Group', 'group1'], ['Team', 'team1']);
			await relateNodes('HAS_TEAM', ['Team', 'team1'], ['Team', 'team2']);

			await request(app)
				.post('/v1/merge')
				.auth('merge-client-id')
				.set('x-request-id', 'merge-request-id')
				.send({
					type: 'Team',
					sourceCode: 'team1',
					destinationCode: 'team2'
				})
				.expect(200);

			[
				({
					event: 'DELETED_NODE',
					action: 'DELETE',
					code: 'team1',
					type: 'Team',
					requestId: 'merge-request-id',
					clientId: 'merge-client-id'
				},
				{
					event: 'UPDATED_NODE',
					action: 'UPDATE',
					code: 'team2',
					type: 'Team',
					requestId: 'merge-request-id',
					clientId: 'merge-client-id'
				},
				{
					code: 'team2',
					type: 'Team',
					event: 'DELETED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TEAM',
						direction: 'incoming',
						nodeCode: 'team1',
						nodeType: 'Team'
					},
					requestId: 'merge-request-id',
					clientId: 'merge-client-id'
				},
				{
					event: 'DELETED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TECH_LEAD',
						direction: 'incoming',
						nodeCode: 'team1',
						nodeType: 'Team'
					},
					code: 'person1',
					type: 'Person',
					requestId: 'merge-request-id',
					clientId: 'merge-client-id'
				},
				{
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TECH_LEAD',
						direction: 'outgoing',
						nodeCode: 'person1',
						nodeType: 'Person'
					},
					code: 'team2',
					type: 'Team',
					requestId: 'merge-request-id',
					clientId: 'merge-client-id'
				},
				{
					event: 'DELETED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TEAM',
						direction: 'outgoing',
						nodeCode: 'team1',
						nodeType: 'Team'
					},
					code: 'group1',
					type: 'Group',
					requestId: 'merge-request-id',
					clientId: 'merge-client-id'
				},
				{
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TEAM',
						direction: 'incoming',
						nodeCode: 'group1',
						nodeType: 'Group'
					},
					code: 'team2',
					type: 'Team',
					requestId: 'merge-request-id',
					clientId: 'merge-client-id'
				},
				{
					code: 'group1',
					type: 'Group',
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TEAM',
						direction: 'outgoing',
						nodeCode: 'team2',
						nodeType: 'Team'
					},
					requestId: 'merge-request-id',
					clientId: 'merge-client-id'
				},
				{
					code: 'person2',
					type: 'Person',
					event: 'DELETED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_PRODUCT_OWNER',
						direction: 'incoming',
						nodeCode: 'team1',
						nodeType: 'Team'
					},
					requestId: 'merge-request-id',
					clientId: 'merge-client-id'
				},
				{
					code: 'person1',
					type: 'Person',
					event: 'CREATED_RELATIONSHIP',
					action: 'UPDATE',
					relationship: {
						relType: 'HAS_TECH_LEAD',
						direction: 'incoming',
						nodeCode: 'team2',
						nodeType: 'Team'
					},
					requestId: 'merge-request-id',
					clientId: 'merge-client-id'
				})
			].map(event => expect(state.stubSendEvent).calledWith(event));

			await deleteNode('Group', 'group1');
			await deleteNode('Person', 'person1');
			await deleteNode('Person', 'person2');
		});
	});
});

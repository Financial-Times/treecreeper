const { expect } = require('chai');
const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { session: db } = require('../../server/db-connection');
const { setupMocks } = require('./helpers');

describe('v1 - node DELETE', () => {
	const state = {};

	setupMocks(state);

	const verifyDeletion = async () => {
		const result = await db.run(
			`MATCH (n:Team { code: "test-team" }) RETURN n`
		);
		expect(result.records.length).to.equal(0);
	};

	const verifyNotDeletion = async () => {
		const result = await db.run(
			`MATCH (n:Team { code: "test-team" }) RETURN n`
		);
		expect(result.records.length).to.equal(1);
		const record = result.records[0];
		expect(record.get('n').properties.deletedByRequest).not.to.exist;
	};

	it('deletes a detached node', async () => {
		await request(app)
			.delete('/v1/node/Team/test-team')
			.auth()
			.set('x-request-id', 'delete-request-id')
			.set('x-client-id', 'delete-client-id')
			.expect(204);

		await verifyDeletion();
	});

	it('404 when deleting non-existent node', async () => {
		await request(app)
			.delete('/v1/node/Team/absent-team')
			.auth()
			.set('x-request-id', 'delete-request-id')
			.set('x-client-id', 'delete-client-id')
			.expect(404);

		await verifyNotDeletion();
	});

	it('error informatively when attempting to delete connected node', async () => {
		await db.run(`
			MATCH (node:Team {code: "test-team"}), (person:Person {code: "test-person"})
			MERGE (node)-[:HAS_TECH_LEAD]->(person)
			RETURN node`);

		await request(app)
			.delete('/v1/node/Team/test-team')
			.auth()
			.set('x-request-id', 'delete-request-id')
			.expect(409, /Cannot delete - Team test-team has relationships/);

		await verifyNotDeletion();
	});

	describe('interaction with deleted nodes', () => {
		beforeEach(async () => {
			await request(app)
				.delete('/v1/node/Team/test-team')
				.auth()
				.set('x-request-id', 'delete-request-id')
				.set('x-client-id', 'delete-client-id')
				.end();
		});

		it('GET responds with 404', async () => {
			await request(app)
				.get('/v1/node/Team/test-team')
				.auth()
				.expect(404);
		});

		it('POST responds with 200', async () => {
			await request(app)
				.post('/v1/node/Team/test-team')
				.auth()
				.expect(200);
		});

		it('PATCH responds with 200', async () => {
			await request(app)
				.post('/v1/node/Team/test-team')
				.auth()
				.expect(200);
		});

		it('DELETE responds with 404', async () => {
			await request(app)
				.delete('/v1/node/Team/test-team')
				.auth()
				.expect(404);
		});
	});

	it('logs deletion event to kinesis', async () => {
		await request(app)
			.delete('/v1/node/Team/test-team')
			.auth()
			.set('x-request-id', 'delete-request-id')
			.set('x-client-id', 'delete-client-id')
			.end();

		[
			[
				{
					event: 'DELETED_NODE',
					action: 'DELETE',
					code: 'test-team',
					type: 'Team',
					requestId: 'delete-request-id',
					clientId: 'delete-client-id'
				}
			]
		].map(args => expect(state.stubSendEvent).calledWith(...args));
	});
});

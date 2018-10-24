const { expect } = require('chai');
const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { executeQuery } = require('../../server/data/db-connection');
const { setupMocks, stubDbUnavailable } = require('./helpers');

describe('v1 - node DELETE', () => {
	const state = {};

	setupMocks(state);

	const verifyDeletion = async () => {
		const result = await executeQuery(
			`MATCH (n:Team { code: "test-team" }) RETURN n`
		);
		expect(result.records.length).to.equal(0);
	};

	const verifyNotDeletion = async () => {
		const result = await executeQuery(
			`MATCH (n:Team { code: "test-team" }) RETURN n`
		);
		expect(result.records.length).to.equal(1);
		const record = result.records[0];
		expect(record.get('n').properties.deletedByRequest).not.to.exist;
	};

	it('deletes a detached node', async () => {
		await request(app)
			.delete('/v1/node/Team/test-team')
			.auth('delete-client-id')
			.set('x-request-id', 'delete-request-id')
			.expect(204);

		await verifyDeletion();
	});

	it('404 when deleting non-existent node', async () => {
		await request(app)
			.delete('/v1/node/Team/absent-team')
			.auth('delete-client-id')
			.set('x-request-id', 'delete-request-id')
			.expect(404);

		await verifyNotDeletion();
	});

	it('error informatively when attempting to delete connected node', async () => {
		await executeQuery(`
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

	it('responds with 500 if query fails', async () => {
		stubDbUnavailable(state);
		return request(app)
			.delete('/v1/node/Team/test-team')
			.auth()
			.expect(500);
	});

	it('logs deletion event to kinesis', async () => {
		await request(app)
			.delete('/v1/node/Team/test-team')
			.auth('delete-client-id')
			.set('x-request-id', 'delete-request-id')
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

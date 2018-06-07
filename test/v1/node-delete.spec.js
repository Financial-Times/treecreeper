const { expect } = require('chai');
const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { session: db } = require('../../server/db-connection');
const { setupMocks } = require('./helpers');

describe('v1 - node DELETE', () => {
	const state = {};

	setupMocks(state);

	const verifyDeletion = async requestId => {
		const result = await db.run(
			`MATCH (n:System { code: "test-system" }) RETURN n`
		);
		console.log(result, 'result');
		expect(result.records.length).to.equal(1);
		const record = result.records[0];
		expect(record.get('n').properties.deletedByRequest).to.equal(requestId);
		expect(record.get('n').properties.isDeleted).to.equal(true);
	};

	const verifyNotDeletion = async () => {
		const result = await db.run(
			`MATCH (n:System { code: "test-system" }) RETURN n`
		);
		expect(result.records.length).to.equal(1);
		const record = result.records[0];
		expect(record.get('n').properties.deletedByRequest).not.to.exist;
		expect(record.get('n').properties.isDeleted).not.to.exist;
	};

	it('marks a detached node as deleted', async () => {
		await request(app)
			.delete('/v1/node/System/test-system')
			.auth()
			.set('x-request-id', 'delete-request-id')
			.set('x-client-id', 'delete-client-id')
			.expect(204);

		await verifyDeletion('delete-request-id');
	});

	it('404 when deleting non-existent node', async () => {
		await request(app)
			.delete('/v1/node/System/absent-system')
			.auth()
			.set('x-request-id', 'delete-request-id')
			.set('x-client-id', 'delete-client-id')
			.expect(404);

		await verifyNotDeletion('delete-request-id');
	});

	it('error informatively when attempting to delete connected node', async () => {
		await db.run(`
			MATCH (node:System {code: "test-system"}), (person:Person {code: "test-person"})
			MERGE (node)-[:HAS_TECH_LEAD]->(person)
			RETURN node`);

		await request(app)
			.delete('/v1/node/System/test-system')
			.auth()
			.set('x-request-id', 'delete-request-id')
			.set('x-client-id', 'delete-client-id')
			.expect(409, 'Cannot delete - System test-system has relationships');

		await verifyNotDeletion('delete-request-id');
	});

	describe('interaction with deleted nodes', () => {
		beforeEach(async () => {
			await request(app)
				.delete('/v1/node/System/test-system')
				.auth()
				.set('x-request-id', 'delete-request-id')
				.set('x-client-id', 'delete-client-id')
				.end();
		});

		it('GET responds with 410', async () => {
			await request(app)
				.get('/v1/node/System/test-system')
				.auth()
				.expect(410);
		});

		it('POST responds with 409', async () => {
			await request(app)
				.post('/v1/node/System/test-system')
				.auth()
				.expect(409);
		});

		it('PATCH responds with 409', async () => {
			await request(app)
				.post('/v1/node/System/test-system')
				.auth()
				.expect(409);
		});

		it('DELETE responds with 410', async () => {
			await request(app)
				.delete('/v1/node/System/test-system')
				.auth()
				.expect(410);
		});
	});

	it('has case insensitive url', async () => {
		await request(app)
			.delete('/v1/node/sysTem/Test-sYStem')
			.auth()
			.set('x-request-id', 'delete-request-id')
			.set('x-client-id', 'delete-client-id')
			.expect(204);

		await verifyDeletion('delete-request-id');
	});

	it('logs deletion event to kinesis', async () => {
		await request(app)
			.delete('/v1/node/System/test-system')
			.auth()
			.set('x-request-id', 'delete-request-id')
			.set('x-client-id', 'delete-client-id')
			.end();

		[
			[
				{
					event: 'DELETED_NODE',
					action: 'DELETE',
					code: 'test-system',
					type: 'System',
					requestId: 'delete-request-id',
					clientId: 'delete-client-id'
				}
			]
		].map(args => expect(state.stubSendEvent).calledWith(...args));
	});
});

const { expect } = require('chai');
const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { session: db } = require('../../server/db-connection');

const { setupMocks, getRelationship } = require('./helpers');

describe('v1 - relationship - handling deleted nodes', () => {
	const state = {};

	setupMocks(state, { withRelationships: true });

	describe('deleted start', () => {
		beforeEach(() =>
			db.run(`
			MATCH (s:System {id: 'test-system'})
			SET s.isDeleted = true
			RETURN s`));

		it('GET responds with 410 if start node is deleted', async () => {
			return request(app)
				.get(
					'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person'
				)
				.auth()
				.expect(410);
		});

		it('POST responds with 410 if start node is deleted', async () => {
			await request(app)
				.post(
					'/v1/relationship/System/test-system/HAS_TEAM_MEMBER/Person/test-person'
				)
				.auth()
				.expect(410);

			const result = await getRelationship('HAS_TEAM_MEMBER');
			expect(result.records.length).to.equal(0);
		});

		it('PATCH responds with 410 if start node is deleted', async () => {
			await request(app)
				.patch(
					'/v1/relationship/System/test-system/HAS_TEAM_MEMBER/Person/test-person'
				)
				.auth()
				.expect(410);

			const result = await getRelationship('HAS_TEAM_MEMBER');
			expect(result.records.length).to.equal(0);
		});

		it('DELETE responds with 410 if start node is deleted', async () => {
			await request(app)
				.patch(
					'/v1/relationship/System/test-system/HAS_TEAM_MEMBER/Person/test-person'
				)
				.auth()
				.expect(410);

			const result = await getRelationship('HAS_TECH_LEAD');
			expect(result.records.length).to.equal(1);
		});
	});

	describe('deleted end', () => {
		beforeEach(() =>
			db.run(`
			MATCH (p:Person {id: 'test-person'})
			SET p.isDeleted = true
			RETURN p`));

		it('GET responds with 410 if end node is deleted', async () => {
			return request(app)
				.get(
					'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person'
				)
				.auth()
				.expect(410);
		});

		it('POST responds with 410 if end node is deleted', async () => {
			await request(app)
				.post(
					'/v1/relationship/System/test-system/HAS_TEAM_MEMBER/Person/test-person'
				)
				.auth()
				.expect(410);

			const result = await getRelationship('HAS_TEAM_MEMBER');
			expect(result.records.length).to.equal(0);
		});

		it('PATCH responds with 410 if end node is deleted', async () => {
			await request(app)
				.patch(
					'/v1/relationship/System/test-system/HAS_TEAM_MEMBER/Person/test-person'
				)
				.auth()
				.expect(410);

			const result = await getRelationship('HAS_TEAM_MEMBER');
			expect(result.records.length).to.equal(0);
		});

		it('DELETE responds with 410 if end node is deleted', async () => {
			await request(app)
				.patch(
					'/v1/relationship/System/test-system/HAS_TEAM_MEMBER/Person/test-person'
				)
				.auth()
				.expect(410);

			const result = await getRelationship('HAS_TECH_LEAD');
			expect(result.records.length).to.equal(1);
		});
	});
});

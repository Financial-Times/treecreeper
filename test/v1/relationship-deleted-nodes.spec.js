const { expect } = require('chai');
const request = require('../helpers/supertest');
const app = require('../../server/app.js');

const { setupMocks, getRelationship } = require('./helpers');

describe('v1 - relationship - handling absent nodes', () => {
	const state = {};

	setupMocks(state, { withRelationships: true });

	describe('absent start', () => {

		it('GET responds with 404 if start node is absent', async () => {
			return request(app)
				.get(
					'/v1/relationship/System/test-system-absent/HAS_TECH_LEAD/Person/test-person'
				)
				.auth()
				.expect(404);
		});

		it('POST responds with 400 if start node is absent', async () => {
			await request(app)
				.post(
					'/v1/relationship/System/test-system-absent/HAS_TEAM_MEMBER/Person/test-person'
				)
				.auth()
				.expect(400);

			const result = await getRelationship('HAS_TEAM_MEMBER');
			expect(result.records.length).to.equal(0);
		});

		it('PATCH responds with 400 if start node is absent', async () => {
			await request(app)
				.patch(
					'/v1/relationship/System/test-system-absent/HAS_TEAM_MEMBER/Person/test-person'
				)
				.auth()
				.expect(400);

			const result = await getRelationship('HAS_TEAM_MEMBER');
			expect(result.records.length).to.equal(0);
		});

		it('DELETE responds with 400 if start node is absent', async () => {
			await request(app)
				.patch(
					'/v1/relationship/System/test-system-absent/HAS_TEAM_MEMBER/Person/test-person'
				)
				.auth()
				.expect(400);

			const result = await getRelationship('HAS_TECH_LEAD');
			expect(result.records.length).to.equal(1);
		});
	});

	describe('absent end', () => {

		it('GET responds with 404 if end node is absent', async () => {
			return request(app)
				.get(
					'/v1/relationship/System/test-system/HAS_TECH_LEAD/Person/test-person-absent'
				)
				.auth()
				.expect(404);
		});

		it('POST responds with 400 if end node is absent', async () => {
			await request(app)
				.post(
					'/v1/relationship/System/test-system/HAS_TEAM_MEMBER/Person/test-person-absent'
				)
				.auth()
				.expect(400);

			const result = await getRelationship('HAS_TEAM_MEMBER');
			expect(result.records.length).to.equal(0);
		});

		it('PATCH responds with 400 if end node is absent', async () => {
			await request(app)
				.patch(
					'/v1/relationship/System/test-system/HAS_TEAM_MEMBER/Person/test-person-absent'
				)
				.auth()
				.expect(400);

			const result = await getRelationship('HAS_TEAM_MEMBER');
			expect(result.records.length).to.equal(0);
		});

		it('DELETE responds with 400 if end node is absent', async () => {
			await request(app)
				.patch(
					'/v1/relationship/System/test-system/HAS_TEAM_MEMBER/Person/test-person-absent'
				)
				.auth()
				.expect(400);

			const result = await getRelationship('HAS_TECH_LEAD');
			expect(result.records.length).to.equal(1);
		});
	});
});

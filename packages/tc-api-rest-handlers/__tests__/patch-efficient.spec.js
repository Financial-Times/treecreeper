const { setupMocks } = require('../../../test-helpers');
const { spyDbQuery } = require('../../../test-helpers/db-spies');

const { patchHandler } = require('../patch');

const patch = patchHandler();

describe('rest PATCH efficient', () => {
	const namespace = 'api-rest-handlers-patch-efficient';
	const mainCode = `${namespace}-main`;
	const leafCode = `${namespace}-leaf`;

	const { createNode } = setupMocks(namespace);
	it('only queries database for affected created relationships', async () => {
		await createNode('RelationshipTestsOne', {
			code: mainCode,
		});
		const dbQuerySpy = spyDbQuery();
		const { status } = await patch({
			type: 'RelationshipTestsOne',
			code: mainCode,
			body: { simpleRelationship: leafCode },
			query: {
				efficientWrite: true,
				upsert: true,
				relationshipAction: 'merge',
			},
		});
		expect(status).toBe(200);
		dbQuerySpy.mock.calls.forEach(([query]) => {
			expect(query).toContain(
				'OPTIONAL MATCH (node)-[relationship:MANY_TO_ONE]-(related)',
			);
		});
	});

	it('works with multiple created relationships', async () => {
		await createNode('RelationshipTestsOne', {
			code: mainCode,
		});
		const dbQuerySpy = spyDbQuery();
		const { status } = await patch({
			type: 'RelationshipTestsOne',
			code: mainCode,
			body: { simpleRelationship: leafCode, richRelationship: leafCode },
			query: {
				efficientWrite: true,
				upsert: true,
				relationshipAction: 'merge',
			},
		});
		expect(status).toBe(200);
		dbQuerySpy.mock.calls.forEach(([query]) => {
			expect(query).toContain(
				'OPTIONAL MATCH (node)-[relationship:MANY_TO_ONE|RICH_MANY_TO_ONE]-(related)',
			);
		});
	});

	it('only queries database for affected deleted relationships', async () => {
		await createNode('RelationshipTestsOne', {
			code: mainCode,
		});
		const dbQuerySpy = spyDbQuery();
		const { status } = await patch({
			type: 'RelationshipTestsOne',
			code: mainCode,
			body: { '!simpleRelationship': leafCode },
			query: {
				efficientWrite: true,
				upsert: true,
				relationshipAction: 'merge',
			},
		});
		expect(status).toBe(200);
		dbQuerySpy.mock.calls.forEach(([query]) => {
			expect(query).toContain(
				'OPTIONAL MATCH (node)-[relationship:MANY_TO_ONE]-(related)',
			);
		});
	});

});

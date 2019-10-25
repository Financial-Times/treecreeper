const { patchHandler } = require('../packages/api-rest-handlers');

const { schemaReady } = require('../api/server/lib/init-schema');

schemaReady.then(async () => {
	await patchHandler()({
		type: 'MainType',
		code: 'main1',
		body: {
			children: 'child1',
			parents: 'parent1',
		},
		query: { relationshipAction: 'merge', upsert: true },
	});
});

const { patchHandler } = require('../packages/tc-api-rest-handlers');

const schemaSdk = require('../packages/tc-schema-sdk');

schemaSdk.init();

schemaSdk.ready().then(async () => {
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

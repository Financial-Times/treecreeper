const schema = require('@treecreeper/schema-sdk');
const { sendSchemaToS3 } = require('..');

schema.init({ schemaDirectory: process.env.TREECREEPER_SCHEMA_DIRECTORY });

schema.ready().then(() => {
	const schemaObject = Object.assign({}, schema.rawData.getAll(), {
		version: process.env.CIRCLE_TAG,
	});

	sendSchemaToS3(
		process.env.TREECREEPER_SCHEMA_BUCKET,
		'latest',
		schemaObject,
	).then(
		() => console.log('successfully deployed'),
		err => {
			console.error('Failed to deploy');
			console.error(err);
			process.exit(2); // eslint-disable-line unicorn/no-process-exit
		},
	);
});

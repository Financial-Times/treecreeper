const { sendSchemaToS3 } = require('..');
const schema = require('../../../packages/schema-sdk');

schema.init();

schema.ready().then(() => {
	const schemaObject = Object.assign({}, schema.rawData.getAll(), {
		version: process.env.CIRCLE_TAG,
	});

	sendSchemaToS3('latest', schemaObject).then(
		() => console.log('successfully deployed'),
		err => {
			console.error('Failed to deploy');
			console.error(err);
			process.exit(2); // eslint-disable-line unicorn/no-process-exit
		},
	);
});

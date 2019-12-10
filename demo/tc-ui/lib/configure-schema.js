const schema = require('@financial-times/tc-schema-sdk');
const logger = require('@financial-times/lambda-logger');

schema.init({
	schemaBaseUrl: process.env.SCHEMA_BASE_URL,
	updateMode: 'stale',
	logger,
	ttl: 60000,
});

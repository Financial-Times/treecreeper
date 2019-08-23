const schema = require('../../../packages/schema-sdk');
const { logger } = require('./request-context');

schema.configure({
	baseUrl: process.env.SCHEMA_BASE_URL,
	updateMode: 'dev',
	logger,
	ttl: 60000,
});

module.exports = {
	schemaReady: schema.startPolling(),
};

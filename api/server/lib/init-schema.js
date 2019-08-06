const schema = require('../../../schema');
const { logger } = require('./request-context');

schema.configure({
	baseUrl: process.env.SCHEMA_BASE_URL,
	updateMode: 'poll',
	logger,
	ttl: 60000,
});

module.exports = {
	schemaReady: schema.startPolling(),
};

const { updater } = require('../../../packages/schema-sdk');
const { logger } = require('./request-context');

updater.configure({
	baseUrl: process.env.SCHEMA_BASE_URL,
	updateMode: 'dev',
	logger,
	ttl: 60000,
	rawDataDirectory: process.env.TREECREEPER_SCHEMA_DIRECTORY,
});

module.exports = {
	schemaReady: updater.startPolling(),
};

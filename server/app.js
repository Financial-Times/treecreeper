const cluster = require('cluster');
const { schemaReady } = require('./lib/configure-schema');
const { logger } = require('./lib/request-context');
const createApp = require('./create-app');

if (require.main === module || cluster.isWorker || process.env.TEST_STARTUP) {
	const PORT = process.env.PORT || 8888;
	const app = createApp();
	schemaReady.then(() => {
		app.listen(PORT, () => {
			logger.info(`Listening on ${PORT}`);
		});
	});
}

module.exports = createApp;

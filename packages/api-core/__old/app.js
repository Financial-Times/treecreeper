const cluster = require('cluster');
const { schemaReady } = require('./lib/init-schema');
const { logger } = require('./lib/request-context');
const createApp = require('./create-app');
// required here as it adds a listener to schema changes, so needs
// to be included prior to the app starting
require('./init-db');

if (require.main === module || cluster.isWorker || process.env.TEST_STARTUP) {
	const PORT = process.env.PORT || 8888;
	schemaReady.then(() => {
		const app = createApp();
		app.listen(PORT, () => {
			logger.info(`Listening on ${PORT}`);
		});
	});
}

module.exports = createApp;

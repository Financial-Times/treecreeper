const cluster = require('cluster');
const schema = require('@financial-times/biz-ops-schema');
require('./init-db');
const { logger } = require('./lib/request-context');
const createApp = require('./create-app');

if (require.main === module || cluster.isWorker || process.env.TEST_STARTUP) {
	const PORT = process.env.PORT || 8888;
	const app = createApp();

	schema.poller.start(process.env.SCHEMA_BASE_URL).then(() => {
		app.listen(PORT, () => {
			logger.info(`Listening on ${PORT}`);
		});
	});
}

module.exports = createApp;

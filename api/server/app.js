const cluster = require('cluster');
const { logger } = require('../../packages/tc-api-express-logger');
const createApp = require('./create-app');
// required here as it adds a listener to schema changes, so needs
// to be included prior to the app starting
if (require.main === module || cluster.isWorker || process.env.TEST_STARTUP) {
	const PORT = process.env.PORT || 8888;
	createApp().then(app => {
		app.listen(PORT, () => {
			logger.info(`Listening on ${PORT}`);
		});
	});
}

module.exports = createApp;

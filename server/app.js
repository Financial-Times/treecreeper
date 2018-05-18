const express = require('express');
require('express-async-errors');
const logger = require('@financial-times/n-logger').default;
const { ui, api } = require('./routes');
const init = require('../scripts/init');

const ONE_HOUR = 60 * 60 * 1000;

const createApp = () => {
	const app = express();

	app.set('case sensitive routing', true);
	app.set('s3o-cookie-ttl', ONE_HOUR);

	if (process.env.NODE_ENV !== 'production') {
		app.get('/init', init);
	}

	app.use('/api', api(express.Router())); //eslint-disable-line
	app.use('/', ui(express.Router())); //eslint-disable-line

	app.use((error, request, response, next) => {
		logger.error(error);
		next(error);
	});

	return app;
};

if (require.main === module) {
	const PORT = process.env.PORT || 8888;

	createApp().listen(PORT, () => {
		logger.info(`Listening on ${PORT}`);
	});
}

module.exports = createApp;

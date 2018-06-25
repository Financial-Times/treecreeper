const express = require('express');
require('express-async-errors');
const logger = require('@financial-times/n-logger').default;
const { ui, graphql, v1 } = require('./routes');
const { initConstraints } = require('../schema/init-db');
const health = require('./health');

const ONE_HOUR = 60 * 60 * 1000;

const createApp = () => {
	const app = express();

	app.set('case sensitive routing', true);
	app.set('s3o-cookie-ttl', ONE_HOUR);

	// Redirect a frequent typo to correct path
	app.get('/graphql', (req, res) => {
		res.redirect('/graphiql');
	});

	// Redirect legacy graphql url
	app.use('/api/graphql', (req, res) => {
		res.redirect('/graphql');
	});

	app.use('/graphql', graphql(express.Router())); //eslint-disable-line
	app.use('/v1', v1(express.Router())); //eslint-disable-line
	app.use('/', ui(express.Router())); //eslint-disable-line

	app.use((error, request, response, next) => {
		logger.error(error);
		next(error);
	});

	app.get('/__health', health);

	return app;
};

if (require.main === module) {
	const PORT = process.env.PORT || 8888;
	const app = createApp();

	initConstraints().then(() => {
		app.listen(PORT, () => {
			logger.info(`Listening on ${PORT}`);
		});
	});
}

module.exports = createApp;

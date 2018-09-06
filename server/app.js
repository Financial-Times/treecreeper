const cluster = require('cluster');
const express = require('express');
require('express-async-errors');
const { ui, graphql, v1 } = require('./routes');
const { initConstraints } = require('../schema/init-db');
const health = require('./health');
const {
	middleware: contextMiddleware,
	logger
} = require('./lib/request-context');
const requestId = require('./middleware/request-id');
const clientId = require('./middleware/client-id');
const ONE_HOUR = 60 * 60 * 1000;

const createApp = () => {
	const app = express();

	app.use((req, res, next) => {
		console.log(req.httpVersion);
		next();
	});

	app.use(contextMiddleware);
	app.use(requestId);
	app.use(clientId);
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

	app.use('/graphql', graphql(new express.Router()));
	app.use('/v1', v1(new express.Router()));
	app.use('/', ui(new express.Router()));
	app.get('/__health', health);

	app.use(({ path }, res) => {
		logger.info({ path, event: 'PATH_NOT_FOUND_ERROR' }, 'Not found');

		return res.status(404).json({
			errors: [
				{
					message: 'Not Found'
				}
			]
		});
	});

	app.use((error, request, response, next) => {
		logger.error({ error, event: 'UNHANDLED_ERROR' }, 'Unhandled server error');
		next(error);
	});

	return app;
};

if (require.main === module || cluster.isWorker) {
	const PORT = process.env.PORT || 8888;
	const app = createApp();

	initConstraints().then(() => {
		app.listen(PORT, () => {
			logger.info(`Listening on ${PORT}`);
		});
	});
}

module.exports = createApp;

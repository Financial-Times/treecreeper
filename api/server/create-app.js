const express = require('express');
require('express-async-errors');
const metrics = require('next-metrics');
const graphql = require('./routes/graphql/api');
const v2 = require('./routes/rest/v2');
const health = require('./health');
const { middleware: contextMiddleware } = require('./lib/request-context');

const requestId = require('./middleware/request-id');
const {
	errorToErrors,
	notFound,
	uncaughtError,
} = require('./middleware/errors');

const createApp = () => {
	const app = express();

	// __gtg and __health need no preconditions satisfying to respond
	app.get('/__gtg', (req, res) => {
		res.status(200).end();
	});
	app.get('/__health', health);

	// metrics should be one of the first things as needs to be applied before any other middleware executes
	metrics.init({
		flushEvery: 40000,
	});

	app.use((req, res, next) => {
		metrics.instrument(req, { as: 'express.http.req' });
		metrics.instrument(res, { as: 'express.http.res' });
		next();
	});

	// Always assign/propagate requestId and setup request tracing
	app.use(contextMiddleware);
	app.use(requestId);
	app.set('case sensitive routing', true);
	app.use('/graphql', graphql(new express.Router()));
	app.use('/v2', v2(new express.Router()));

	app.use(errorToErrors);
	app.use(notFound);
	app.use(uncaughtError);

	return app;
};

module.exports = createApp;

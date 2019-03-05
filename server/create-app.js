const express = require('express');
require('express-async-errors');
const metrics = require('next-metrics');
const graphiql = require('./routes/graphiql');
const graphql = require('./routes/graphql');
const v2 = require('./routes/v2');
const health = require('./health');
const { middleware: contextMiddleware } = require('./lib/request-context');

const requestId = require('./middleware/request-id');
const {
	errorToErrors,
	notFound,
	uncaughtError,
} = require('./middleware/errors');

const ONE_HOUR = 60 * 60 * 1000;

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
	app.set('s3o-cookie-ttl', ONE_HOUR);

	app.use('/graphiql', graphiql(new express.Router()));

	// Redirect legacy graphql url
	app.use('/api/graphql', (req, res) => {
		res.redirect('/graphql');
	});

	app.use('/graphql', graphql(new express.Router()));
	app.use('/v2', v2(new express.Router()));

	app.use(errorToErrors);
	app.use(notFound);
	app.use(uncaughtError);

	return app;
};

module.exports = createApp;

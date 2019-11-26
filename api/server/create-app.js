const express = require('express');
require('express-async-errors');
const metrics = require('next-metrics');
const timeout = require('connect-timeout');
const { getApp } = require('../../packages/tc-api-express');
// const { createStore } = require('../../packages/tc-api-s3-document-store');
const health = require('./health');

const {
	errorToErrors,
	notFound,
	uncaughtError,
} = require('./middleware/errors');

const { TIMEOUT } = require('./constants');
const security = require('./middleware/security');
const maintenance = require('./middleware/maintenance');

const createApp = async () => {
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
	app.set('case sensitive routing', true);
	app.use(timeout(TIMEOUT));
	app.use(security.requireApiKey);

	await getApp({
		app,
		graphqlPath: '/graphql',
		graphqlMethods: ['post', 'get'],
		graphqlMiddlewares: [maintenance.disableReads],
		restPath: '/v2/node',
		restMethods: ['HEAD', 'POST', 'DELETE', 'PATCH', 'ABSORB'],
		restMiddlewares: [maintenance.disableReads, maintenance.disableWrites],
		schemaOptions: { updateMode: 'poll' },
		republishSchemaPrefix: 'api',
		republishSchema: true,
		// documentStore: createStore(),
	}).then(() => {
		app.use(errorToErrors);
		app.use(notFound);
		app.use(uncaughtError);
	});

	return app;
};

module.exports = createApp;

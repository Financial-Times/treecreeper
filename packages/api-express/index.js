const express = require('express');
require('express-async-errors');
const bodyParser = require('body-parser');
const { getRestApi } = require('./lib/get-rest-api');
const clientId = require('./middleware/client-id');
const requestId = require('./middleware/request-id');
const { middleware: contextMiddleware } = require('./lib/request-context');

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true }),
];

const getApp = ({
	app = express(),
	graphqlPath = '/graphql',
	graphqlMiddlewares = [],
	restPath = '/rest',
	restMiddlewares,
} = {}) => {
	app.use(contextMiddleware);
	app.use(requestId);
	app.use(clientId);
	app.use(bodyParsers);
	if (restMiddlewares) {
		app.use(restPath, restMiddlewares, getRestApi({ app }));
	} else {
		app.use(restPath, getRestApi({ app }));
	}
	return app;
};

module.exports = { getApp };

const express = require('express');
require('express-async-errors');
const bodyParser = require('body-parser');
const schema = require('../../packages/schema-sdk');
const {
	listenForChanges: updateConstraintsOnSchemaChange,
} = require('../../packages/api-db-manager');
const { getRestApi } = require('./lib/get-rest-api');
const clientId = require('./middleware/client-id');
const requestId = require('./middleware/request-id');
const { errorToErrors } = require('./middleware/errors');
const {
	logger,
	middleware: contextMiddleware,
} = require('./lib/request-context');

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true }),
];

const getApp = async ({
	app = express(),
	graphqlPath = '/graphql',
	graphqlMiddlewares = [],
	restPath = '/rest',
	restMiddlewares = [],
} = {}) => {
	updateConstraintsOnSchemaChange();
	schema.init();

	const router = new express.Router();
	router.use(contextMiddleware);
	router.use(requestId);
	router.use(clientId);
	router.use(bodyParsers);

	if (restMiddlewares) {
	router.use(restPath, restMiddlewares, getRestApi({}));
	} else {
	router.use(restPath, getRestApi({}));
	}
	router.use(errorToErrors);
	app.use('/', router);
	await schema.ready();
	app.logger = logger;
	return app;
};

module.exports = { getApp };

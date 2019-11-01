const express = require('express');
require('express-async-errors');
const bodyParser = require('body-parser');
const schema = require('../../packages/schema-sdk');
const {
	listenForSchemaChanges: updateConstraintsOnSchemaChange,
} = require('../../packages/api-db-manager');
const { getGraphqlApi } = require('../../packages/api-graphql');
const { getRestApi } = require('./lib/get-rest-api');
const clientId = require('./middleware/client-id');
const requestId = require('./middleware/request-id');
const { errorToErrors } = require('./middleware/errors');
const { createLogger, loggerMiddleware } = require('../api-express-logger');

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true }),
];

const getApp = async (options = {}) => {
	const {
		app = express(),
		treecreeperPath = '/',
		graphqlPath = '/graphql',
		graphqlMethods = ['post'],
		graphqlMiddlewares = [],
		restPath = '/rest',
		restMiddlewares = [],
		logger,
	} = options;
	updateConstraintsOnSchemaChange();
	schema.init();

	const appLogger = createLogger(logger);
	const router = new express.Router();
	router.use(loggerMiddleware(appLogger));
	router.use(requestId(appLogger));
	router.use(clientId(appLogger));
	router.use(bodyParsers);
	router.use(
		restPath,
		restMiddlewares.map(middleware => middleware(appLogger)),
		getRestApi({ ...options }),
	);
	router.use(errorToErrors(appLogger));

	const {
		isSchemaUpdating,
		graphqlHandler,
		listenForSchemaChanges: updateGraphqlApiOnSchemaChange,
	} = getGraphqlApi(options);

	updateGraphqlApiOnSchemaChange();

	graphqlMethods.forEach(method =>
		router[method](graphqlPath, graphqlMiddlewares, graphqlHandler),
	);

	app.use(treecreeperPath, router);
	await schema.ready();
	app.treecreeper = {
		logger: appLogger,
		isSchemaUpdating,
	};
	return app;
};

module.exports = { getApp };

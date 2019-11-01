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
const { createLogger, loggerMiddleware, Logger } = require('../api-logger');

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true }),
];

const checkLogger = logger => {
	if (!(logger instanceof Logger)) {
		throw new TypeError('logger must extend Logger');
	}
};

const getApp = async (options = {}) => {
	const {
		app = express(),
		treecreeperPath = '/',
		graphqlPath = '/graphql',
		graphqlMethods = ['post'],
		graphqlMiddlewares = [],
		restPath = '/rest',
		restMiddlewares = [],
		logger = createLogger(),
	} = options;
	updateConstraintsOnSchemaChange();
	schema.init();
	checkLogger(logger);

	const router = new express.Router();
	router.use(loggerMiddleware(logger));
	router.use(requestId(logger));
	router.use(clientId(logger));
	router.use(bodyParsers);
	router.use(
		restPath,
		restMiddlewares.map(middleware => middleware(logger)),
		getRestApi({ ...options }),
	);
	router.use(errorToErrors(logger));

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
		logger,
		isSchemaUpdating,
	};
	return app;
};

module.exports = { getApp };

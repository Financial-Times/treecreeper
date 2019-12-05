const express = require('express');
const timeoutMiddleware = require('connect-timeout');
require('express-async-errors');
const bodyParser = require('body-parser');
const schema = require('@financial-times/tc-schema-sdk');
const {
	listenForSchemaChanges: updateConstraintsOnSchemaChange,
	setTimeout: setDbQueryTimeout,
} = require('@financial-times/tc-api-db-manager');
const { getGraphqlApi } = require('@financial-times/tc-api-graphql');
const {
	logger,
	middleware: contextMiddleware,
} = require('@financial-times/tc-api-express-logger');
const {
	emitter,
	availableEvents,
} = require('@financial-times/tc-api-rest-handlers');
const { getRestApi } = require('./lib/get-rest-api');
const clientId = require('./middleware/client-id');
const requestId = require('./middleware/request-id');
const { errorToErrors } = require('./middleware/errors');

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true }),
];

const { requestLog } = require('./lib/request-log');

const getApp = async (options = {}) => {
	const {
		app = express(),
		treecreeperPath = '/',
		graphqlPath = '/graphql',
		graphqlMethods = ['post'],
		graphqlMiddlewares = [],
		restPath = '/rest',
		restMiddlewares = [],
		schemaOptions,
		timeout,
	} = options;

	const router = new express.Router();
	if (timeout) {
		setDbQueryTimeout(timeout);
		router.use(timeoutMiddleware(timeout));
	}
	router.use(contextMiddleware);
	router.use(requestId);
	router.use(clientId);
	router.use(bodyParsers);
	router.use(restPath, restMiddlewares, getRestApi(options));
	router.use(errorToErrors);

	const {
		isSchemaUpdating,
		graphqlHandler,
		listenForSchemaChanges: updateGraphqlApiOnSchemaChange,
	} = getGraphqlApi(options);

	graphqlMethods.forEach(method =>
		router[method](
			graphqlPath,
			graphqlMiddlewares,
			(req, res, next) => {
				requestLog('graphql', req.method.toUpperCase(), req, res);
				next();
			},
			graphqlHandler,
		),
	);

	app.use(treecreeperPath, router);
	app.treecreeper = {
		logger,
		isSchemaUpdating,
		emitter,
		availableEvents,
	};

	schema.init(schemaOptions);
	updateGraphqlApiOnSchemaChange();
	// avoids this running in every single spec file
	// instead we explictly set up the constraints once before we start the test suite
	if (!process.env.TREECREEPER_TEST) {
		updateConstraintsOnSchemaChange();
	}

	await schema.ready();

	return app;
};

module.exports = { getApp };

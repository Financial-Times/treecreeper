const express = require('express');
require('express-async-errors');
const bodyParser = require('body-parser');
const schema = require('@treecreeper/schema-sdk');
const {
	listenForSchemaChanges: updateConstraintsOnSchemaChange,
} = require('@treecreeper/api-db-manager');
const { getGraphqlApi } = require('@treecreeper/api-graphql');
const {
	logger,
	middleware: contextMiddleware,
} = require('@treecreeper/api-express-logger');
const { getRestApi } = require('./lib/get-rest-api');
const clientId = require('./middleware/client-id');
const requestId = require('./middleware/request-id');
const { errorToErrors } = require('./middleware/errors');

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
	} = options;
	updateConstraintsOnSchemaChange();
	schema.init();

	const router = new express.Router();
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

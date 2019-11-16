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
const {
	logger,
	middleware: contextMiddleware,
} = require('./lib/request-context');

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

	schema.init();
	updateGraphqlApiOnSchemaChange();
	updateConstraintsOnSchemaChange();

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

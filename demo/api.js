const bodyParser = require('body-parser');
const express = require('express');
const path = require('path');
const expressPlayground = require('graphql-playground-middleware-express')
	.default;
const { getApp } = require('../packages/tc-api-express');
const { autocomplete } = require('./controllers/autocomplete');

const PORT = process.env.PORT || 8888;
const app = express();
app.use(express.static(path.join(__dirname, '../dist/browser')));
app.get('/autocomplete/:type/:field', autocomplete);
app.use(
	'/graphiql',
	expressPlayground({
		endpoint: '/api/graphql',
		settings: {
			'request.credentials': 'same-origin',
		},
	}),
);

getApp({
	treecreeperPath: '/api',
	app,
	graphqlMethods: ['post', 'get'] ,
	schemaOptions: {
		updateMode: 'poll',
		schemaBaseUrl: process.env.SCHEMA_BASE_URL
	}


}).then(
	() => {
		app.listen(PORT, () => {
			// eslint-disable-next-line no-console
			console.log(`Listening on ${PORT}`);
		});
	},
);

require('@babel/register'); // eslint-disable-line  import/no-extraneous-dependencies
const {
	editController,
	viewController,
	deleteController,
	anotherController,
} = require('./cms');

const parseBody = bodyParser.urlencoded({ limit: '8mb', extended: true });
app.get('/lalala', anotherController);
app.get('/:type/:code/edit', editController);
app.post('/:type/:code/edit', parseBody, editController);
app.get('/:type/create', editController);
app.post('/:type/create', parseBody, editController);
app.post('/:type/:code/delete', deleteController);
app.get('/:type/:code', viewController);

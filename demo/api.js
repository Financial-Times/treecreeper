const bodyParser = require('body-parser');
const express = require('express');
const path = require('path');
const expressPlayground = require('graphql-playground-middleware-express')
	.default;
const { getApp } = require('../packages/tc-api-express');
const { getGraphqlApi } = require('../packages/tc-api-graphql');
const { createStore } = require('../packages/tc-api-s3-document-store');
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

// removes a little bit of hassle from manually testing the api
app.use((req, res, next) => {
	if (/\/graphiql$/.test(req.headers.referer)) {
		req.headers['client-id'] = 'treecreeper-demo';
	}
	next();
});

const tcPromise = getApp({
	treecreeperPath: '/api',
	app,
	graphqlMethods: ['post', 'get'],
	documentStore: process.env.WITH_DOCSTORE
		? createStore(`biz-ops-documents.${process.env.AWS_ACCOUNT_ID}`)
		: null,
})

const { SDK } = require('../packages/tc-schema-sdk');

const schemaInstance = new SDK({
	schemaBaseUrl:
		'https://s3.eu-west-1.amazonaws.com/biz-ops-schema.510688331160/beta-risk-model',
});

schemaInstance.init();

const result = getGraphqlApi({
	schemaInstance,
});

console.log(result)

const { graphqlHandler } = result;


console.log({la: 1, graphqlHandler})

app.post('/api/beta-graphql', graphqlHandler);

Promise.all([tcPromise, schemaInstance.ready()]).then(() => {
	app.listen(PORT, () => {
		// eslint-disable-next-line no-console
		console.log(`Listening on ${PORT}`);
	});
});

require('@babel/register'); // eslint-disable-line  import/no-extraneous-dependencies
const { editController, viewController, deleteController } = require('./cms');

const parseBody = bodyParser.urlencoded({ limit: '8mb', extended: true });
app.get('/', (req, res) => {
	res.send(`<html><head></head><body>
<a href="/graphiql">GraphQL explorer.</a>
</body></html>`);
});
app.get('/:type/:code/edit', editController);
app.post('/:type/:code/edit', parseBody, editController);
app.get('/:type/create', editController);
app.post('/:type/create', parseBody, editController);
app.post('/:type/:code/delete', deleteController);
app.get('/:type/:code', viewController);

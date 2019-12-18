const bodyParser = require('body-parser');
const express = require('express');
const expressPlayground = require('graphql-playground-middleware-express')
	.default;
const { getApp } = require('../packages/tc-api-express');
const { autocomplete } = require('./controllers/autocomplete');

const PORT = process.env.PORT || 8888;
const app = express();
app.get('/autocomplete/:type/:field', autocomplete);
app.use(
	'/graphiql',
	expressPlayground({
		endpoint: '/graphql',
		settings: {
			'request.credentials': 'same-origin',
		},
	}),
);

getApp({ treecreeperPath: '/api', app, graphqlMethods: ['post', 'get'] }).then(
	() => {
		app.listen(PORT, () => {
			console.log(`Listening on ${PORT}`);
		});
	},
);

require('module-alias').addAliases({
	react: 'preact/compat',
	'react-dom': 'preact/compat',
});
require('@babel/register'); // eslint-disable-line  import/no-extraneous-dependencies
const { editController, viewController, deleteController } = require('./cms');

const parseBody = bodyParser.urlencoded({ limit: '8mb', extended: true });

app.get('/:type/:code/edit', editController);
app.post('/:type/:code/edit', parseBody, editController);
app.get('/:type/create', editController);
app.post('/:type/create', parseBody, editController);
app.post('/:type/:code/delete', deleteController);
app.get('/:type/:code', viewController);

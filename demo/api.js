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

require('@babel/register'); // eslint-disable-line  import/no-extraneous-dependencies
const editController = require('./controllers/edit');
const viewController = require('./controllers/view');

app.use(
	'/:type/:code/edit',
	bodyParser.urlencoded({ limit: '8mb', extended: true }),
	editController,
);
app.use(
	'/:type/create',
	bodyParser.urlencoded({ limit: '8mb', extended: true }),
	editController,
);
app.use('/:type/:code', viewController);

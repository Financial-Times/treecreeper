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

getApp({ app, graphqlMethods: ['post', 'get'] }).then(() => {
	app.listen(PORT, () => {
		console.log(`Listening on ${PORT}`);
	});
});

require('@babel/register');
app.use('/view', require('./view').handler);

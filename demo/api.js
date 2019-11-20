const express = require('express');
const rewrite = require('express-urlrewrite'); // eslint-disable-line  import/no-extraneous-dependencies
const expressPlayground = require('graphql-playground-middleware-express')
	.default;
const { getApp } = require('../packages/tc-api-express');

const PORT = process.env.PORT || 8888;
const app = express();
app.use(
	'/graphiql',
	expressPlayground({
		endpoint: '/graphql-with-cookies',
		settings: {
			'request.credentials': 'same-origin',
		},
	}),
);

app.use('/graphql-with-cookies', (req, res, next) => {
	req.headers.api_key = 'yabdadda';
	next();
});

app.use(rewrite('/graphql-with-cookies', '/graphql'));

getApp({ app, graphqlMethods: ['post', 'get'] }).then(() => {
	app.listen(PORT, () => {
		console.log(`Listening on ${PORT}`);
	});
});

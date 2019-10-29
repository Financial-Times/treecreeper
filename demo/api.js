const expressPlayground = require('graphql-playground-middleware-express')
	.default;
const { getApp } = require('../packages/api-express');

const PORT = process.env.PORT || 8888;

getApp({ graphqlMethods: ['post', 'get'] }).then(app => {
	app.use(
		'/graphiql',
		expressPlayground({
			endpoint: '/graphql',
			settings: {
				'request.credentials': 'same-origin',
			},
		}),
	);
	app.listen(PORT, () => {
		app.logger(`Listening on ${PORT}`);
	});
});

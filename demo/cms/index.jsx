const React = require('react');
const logger = require('@financial-times/lambda-logger');
const { getCMS } = require('@financial-times/tc-ui');

const { Header } = require('./components/header');
const { Footer } = require('./components/footer');
const { Subheader } = require('./components/subheader');

const customComponents = require('./components/primitives');

const wrapCmsHandler = handler => async (req, res) => {
	try {
		const { status, body, headers } = await handler({
			...req.params,
			metadata: { clientUserId: 'rhys.evans' },
			query: req.query || {},
			method: req.method,
			body: req.body,
		});
		if (headers) {
			res.set(headers);
		}

		res.status(status).send(body);
	} catch (e) {
		console.log(e);
		res.send(500).end();
	}
};

const {
	viewHandler,
	deleteHandler,
	editHandler,
	handleError,
	renderPage,
} = getCMS({
	logger,
	restApiUrl: 'http://local.in.ft.com:8888/api/rest',
	graphqlApiUrl: 'http://local.in.ft.com:8888/api/graphql',
	apiHeaders: ({ metadata: { clientUserId } }) => ({
		'client-id': 'treecreeper-demo',
		'client-user-id': clientUserId,
	}),
	Header,
	Footer,
	Subheader,
	customComponents,
	origamiCssModules: {
		'header-services': '^3.2.3',
		table: '^7.0.5',
		labels: '^4.1.1',
		'footer-services': '^2.1.0',
	},
	origamiJsModules: {
		table: '^7.0.5',
		'header-services': '^3.2.3',
	},
	customTypeMappings: {
		Paragraph: 'LargeText',
	},
	assetManifest: {
		'main.css': 'main.css',
		'main.js': 'main.js',
	},
	assetRoot: 'http://local.in.ft.com:8080/statics/',
});

module.exports = {
	viewController: wrapCmsHandler(viewHandler),
	editController: wrapCmsHandler(editHandler),
	deleteController: wrapCmsHandler(deleteHandler),
	anotherController: wrapCmsHandler(
		handleError(() =>
			renderPage(({ str }) => <div>{str}</div>, { str: 'lalalala' }),
		),
	),
};

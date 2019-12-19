const logger = require('@financial-times/lambda-logger');
const { getCMS } = require('@financial-times/tc-ui');

const { Header } = require('./components/header');
const { Footer } = require('./components/footer');

const customComponents = require('./components/primitives');

const wrapCmsHandler = handler => async (req, res) => {
	try {
		const { status, body, headers } = await handler({
			type: req.params.type,
			code: req.params.code,
			params: req.params,
			username: 'rhys.evans',
			query: req.query || {},
			method: req.method,
			body: req.body,
		});
		if (headers) {
			res.set(headers);
		}

		res.status(status).send(body);
	} catch (e) {
		res.send(500).end();
	}
};

const { viewHandler, deleteHandler, editHandler } = getCMS({
	logger,
	restApiUrl: 'http://local.in.ft.com:8888/api/rest',
	graphqlApiUrl: 'http://local.in.ft.com:8888/api/graphql',
	apiHeaders: () => ({
		'x-api-key': process.env.BIZ_OPS_API_KEY,
		'client-id': 'biz-ops-admin',
		'client-user-id': 'rhys.evans',
	}),
	Header,
	Footer,
	customComponents,
	customTypeMappings: {
		Paragraph: 'LargeText',
	},
});

module.exports = {
	viewController: wrapCmsHandler(viewHandler),
	editController: wrapCmsHandler(editHandler),
	deleteController: wrapCmsHandler(deleteHandler),
};

const React = require('react');
const logger = require('@financial-times/lambda-logger');
const { getCMS } = require('@financial-times/tc-ui');

const { Subheader } = require('./components/subheader');
const customComponents = require('./components/primitives');
const ANSIColor = {
    Reset: "\x1b[0m",
    Red: "\x1b[31m",
    Green: "\x1b[32m",
    Yellow: "\x1b[33m",
    Blue: "\x1b[34m",
    Magenta: "\x1b[35m"
};
const consoleFunctionNamesWithColors = [
    ["info", ANSIColor.Green],
    ["log", ANSIColor.Blue],
    ["warn", ANSIColor.Yellow],
    ["error", ANSIColor.Red]
];
for (const [functionName, color] of consoleFunctionNamesWithColors) {
    let oldFunc = console[functionName];
    console[functionName] = function (...args) {
        if (args.length) {
            args = [color + args[0]].concat(args.slice(1), ANSIColor.Reset);
        }
        oldFunc.apply(this, args);
    };
}
// example:
console.info("Info is green.");
console.log("Log is blue.");
console.warn("Warn is orange.");
console.error("Error is red.");
console.info("--------------------");
console.info("Formatting works as well. The number = %d", 123);

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
		logger.error(e);
		res.send(500).end();
	}
};

const { handleError, renderPage } = require('./render');

const { viewHandler, deleteHandler, editHandler } = getCMS({
	logger,
	restApiUrl: 'http://local.in.ft.com:8888/api/rest',
	graphqlApiUrl: 'http://local.in.ft.com:8888/api/graphql',
	clientId: 'treecreeper-demo',
	apiHeaders: ({ metadata: { clientUserId } }) => ({
		'client-user-id': clientUserId,
	}),
	Subheader,
	customComponents,
	handleError,
	renderPage,
	customTypeMappings: {
		Paragraph: 'LargeText',
	},
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

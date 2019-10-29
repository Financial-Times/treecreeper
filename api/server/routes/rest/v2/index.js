const bodyParser = require('body-parser');
const timeout = require('connect-timeout');
const httpErrors = require('http-errors');

const security = require('../../../middleware/security');
const maintenance = require('../../../middleware/maintenance');
const clientId = require('../../../middleware/client-id');
const { TIMEOUT } = require('../../../constants');
const { logger, setContext } = require('../../../lib/request-context');
const { initSalesforceSync } = require('../lib/write-helpers');

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true }),
];

const { errorToErrors } = require('../../../middleware/errors');

const requestLog = (endpointName, method, req) => {
	setContext({
		endpointName,
		method,
		params: req.params,
		query: req.query,
		bodyKeys: Object.keys(req.body || {}),
	});
	logger.info(`[APP] ${endpointName} ${method}`);
};

const unimplemented = (endpointName, method, alternativeMethod) => req => {
	requestLog(endpointName, method, req);
	throw httpErrors(
		405,
		`${method} is unimplemented. Use ${alternativeMethod}`,
	);
};

const controller = (endpointName, method, controllerImplementation) => (
	req,
	res,
	next,
) => {
	res.nextMetricsName = `${endpointName}_${req.params.nodeType ||
		req.body.type}`;
	requestLog(endpointName, method, req);
	controllerImplementation(
		Object.assign(
			{
				// TODO completely remove use of res.locals now we have getContext()
				requestId: res.locals.requestId,
				// Defaults to null rather than undefined because it avoids a 'missing
				// parameter' error and it unsets any previous values when updating.
				clientId: res.locals.clientId || null,
				clientUserId: res.locals.clientUserId || null,
				body: req.body,
				query: req.query,
			},
			req.params,
		),
	)
		.then(result => {
			if (method === 'HEAD') {
				return res.status(result.status).end();
			}
			return result.status
				? res.status(result.status).json(result.data)
				: res.json(result);
		})
		.catch(next);
};

const headHandler = require('./node/head');
const getHandler = require('./node/get');
const postHandler = require('./node/post');
const patchHandler = require('./node/patch');
const deleteHandler = require('./node/delete');
const mergeHandler = require('./merge');

module.exports = router => {
	initSalesforceSync(patchHandler);
	router.use(timeout(TIMEOUT));
	router.use(clientId);
	router.use(security.requireApiKey);
	router.use(maintenance.disableWrites);
	router.use(maintenance.disableReads);
	router.use(bodyParsers);

	router
		.route('/node/:nodeType/:code')
		.head(controller('node', 'HEAD', headHandler))
		.get(controller('node', 'GET', getHandler))
		.post(controller('node', 'POST', postHandler))
		.put(unimplemented('PUT', 'PATCH'))
		.patch(controller('node', 'PATCH', patchHandler))
		.delete(controller('node', 'DELETE', deleteHandler));

	router.post('/merge', controller('merge', 'POST', mergeHandler));

	router.use(errorToErrors);

	return router;
};

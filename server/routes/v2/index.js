const bodyParser = require('body-parser');
const security = require('../../middleware/security');
const maintenance = require('../../middleware/maintenance');
const clientId = require('../../middleware/client-id');

const timeout = require('connect-timeout');
const { logger, setContext } = require('../../lib/request-context');
const httpErrors = require('http-errors');

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true })
];

const { errorToErrors } = require('../../middleware/errors');

const requestLog = (endpointName, method, req) => {
	setContext({ endpointName, method, params: req.params });
	logger.info(`[APP] ${endpointName} ${method}`);
};

const unimplemented = (endpointName, method, alternativeMethod) => req => {
	requestLog(endpointName, method, req);
	throw httpErrors(405, `${method} is unimplemented. Use ${alternativeMethod}`);
};

const controller = (endpointName, method, controllerImplementation) => (
	req,
	res,
	next
) => {
	res.nextMetricsName = `${endpointName}_${req.params.type || req.body.type}`;
	requestLog(endpointName, method, req);
	controllerImplementation(
		Object.assign(
			{
				requestId: res.locals.requestId,
				clientId: res.locals.clientId,
				body: req.body,
				query: req.query
			},
			req.params
		)
	)
		.then(
			result =>
				result.status
					? res.status(result.status).json(result.data)
					: res.json(result)
		)
		.catch(next);
};

module.exports = router => {
	router.use(timeout('65s'));
	router.use(clientId);
	router.use(security.requireApiKey);
	router.use(maintenance.disableWrites);
	router.use(maintenance.disableReads);
	router.use(bodyParsers);

	router
		.route('/node/:nodeType/:code')
		.get(controller('node', 'GET', require('./node-rest/get')))
		.post(controller('node', 'POST', require('./node-rest/post')))
		.put(unimplemented('PUT', 'PATCH'))
		.patch(controller('node', 'PATCH', require('./node-rest/patch')))
		.delete(controller('node', 'DELETE', require('./node-rest/delete')));

	router.post('/merge', controller('merge', 'POST', require('./merge')));

	router.use(errorToErrors);

	return router;
};

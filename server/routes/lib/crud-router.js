const bodyParser = require('body-parser');
const { logger, setContext } = require('../../lib/request-context');
const timeout = require('connect-timeout');
const security = require('../../middleware/security');
const maintenance = require('../../middleware/maintenance');
const httpErrors = require('http-errors');

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true })
];

const success = (res, data) =>
	data.status ? res.status(data.status).json(data.data) : res.json(data);

const failure = (res, err) => {
	logger.error({ event: 'BIZ_OPS_API_ERROR', error: err });

	if (!err.status) {
		logger.error({ error: err });
		err = { status: 500, message: err.toString() };
	}
	res.status(err.status).json({ errors: [{ message: err.message }] });
};

const respond = (res, resultPromise) =>
	resultPromise.then(
		result => success(res, result),
		error => failure(res, error)
	);

const requestLog = (endpointName, method, req) => {
	setContext({ endpointName, method, params: req.params });
	logger.info(`[APP] ${endpointName} ${method}`);
};

const unimplemented = (endpointName, method, alternativeMethod) => (
	req,
	res
) => {
	requestLog(endpointName, method, req);
	return failure(
		res,
		httpErrors(405, `${method} is unimplemented. Use ${alternativeMethod}`)
	);
};

const combineInputs = (req, res) =>
	Object.assign(
		{
			requestId: res.locals.requestId,
			clientId: res.locals.clientId,
			attributes: req.body,
			query: req.query,
			crudAction: methodCrudMap[req.method.toUpperCase()]
		},
		req.params
	);

const methodCrudMap = {
	POST: 'create',
	GET: 'read',
	PATCH: 'update',
	DELETE: 'delete'
};

const getCrudController = (endpointName, crudImplementation) => method => (
	req,
	res
) => {
	requestLog(endpointName, method, req);
	respond(
		res,
		crudImplementation[methodCrudMap[method]](combineInputs(req, res))
	);
};

const applyMiddleware = router => {
	router.use(timeout('65s'));
	router.use(security.requireApiKey);
	router.use(security.requireClientId);
	router.use(maintenance.disableWrites);
	router.use(maintenance.disableReads);
	router.use(bodyParsers);
};

module.exports = {
	applyMiddleware,
	getCrudController,
	unimplemented
};

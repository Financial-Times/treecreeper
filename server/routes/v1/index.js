const bodyParser = require('body-parser');
const { logger, setContext } = require('../../lib/request-context');
const timeout = require('connect-timeout');
const security = require('../../middleware/security');
const maintenance = require('../../middleware/maintenance');
const httpErrors = require('http-errors');

const crud = {
	node: require('./node-crud'),
	relationship: require('./relationship-crud')
};
const merge = require('./merge');

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true })
];

const success = (res, data) =>
	data.status ? res.status(data.status).json(data.data) : res.json(data);

const failure = (res, err) => {
	logger.error({ event: 'CRUD_ERROR', error: err });

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

const requestLog = (endpoint, method, req) => {
	setContext({ endpoint, method, params: req.params });
	logger.info(`[APP] ${endpoint} ${method}`);
};

const unimplemented = (endpoint, method, alternativeMethod) => (req, res) => {
	requestLog(endpoint, method, req);
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
			body: req.body,
			query: req.query
		},
		req.params
	);

const methodCrudMap = {
	POST: 'create',
	GET: 'read',
	PATCH: 'update',
	DELETE: 'delete'
};

const crudController = (endpoint, method) => (req, res) => {
	requestLog(endpoint, method, req);
	respond(res, crud[endpoint][methodCrudMap[method]](combineInputs(req, res)));
};

module.exports = router => {
	router.use(timeout('65s'));

	router.use(security.requireApiKey);
	router.use(security.requireClientId);
	router.use(maintenance.disableWrites);
	router.use(maintenance.disableReads);
	router.use(bodyParsers);

	const nodeRestUrl = '/node/:nodeType/:code';
	router.get(nodeRestUrl, crudController('node', 'GET'));
	router.post(nodeRestUrl, crudController('node', 'POST'));
	router.put(nodeRestUrl, unimplemented('node', 'PUT', 'PATCH'));
	router.patch(nodeRestUrl, crudController('node', 'PATCH'));
	router.delete(nodeRestUrl, crudController('node', 'DELETE'));

	const relationshipRestUrl =
		'/relationship/:nodeType/:code/:relationshipType/:relatedType/:relatedCode';
	router.get(relationshipRestUrl, crudController('relationship', 'GET'));
	router.post(relationshipRestUrl, crudController('relationship', 'POST'));
	router.put(
		relationshipRestUrl,
		unimplemented('relationship', 'PUT', 'PATCH')
	);
	router.patch(relationshipRestUrl, crudController('relationship', 'PATCH'));
	router.delete(relationshipRestUrl, crudController('relationship', 'DELETE'));

	router.post('/merge', async (req, res) => {
		requestLog('merge', 'POST', req);
		return respond(res, merge(combineInputs(req, res)));
	});

	return router;
};

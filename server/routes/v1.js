const bodyParser = require('body-parser');
const { logger, setContext } = require('../lib/request-context');
const timeout = require('connect-timeout');
const security = require('../middleware/security');
const { nodeCrud, relationshipCrud } = require('../crud');
const maintenance = require('../middleware/maintenance');

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true })
];

const success = res => data =>
	data.status ? res.status(data.status).json(data.data) : res.json(data);

const failure = res => err => {
	logger.debug({ event: 'CRUD_ERROR', error: err });

	if (!err.status) {
		logger.error({ error: err });
		err = { status: 500, message: err.toString() };
	}
	res.status(err.status).json({ errors: [{ message: err.message }] });
};

const unimplemented = (logMessage, errorMessage) => (req, res) => {
	logger.info(`[APP] ${logMessage}`, req.params);
	return failure(res)(
		Object.assign(new Error(errorMessage), {
			status: 405
		})
	);
};

const requestLog = (endpoint, method, req) => {
	setContext({ endpoint, method, params: req.params });
	logger.info(`[APP] ${endpoint} ${method}`);
};

module.exports = router => {
	router.use(timeout('65s'));

	router.use(security.requireApiKey);
	router.use(security.requireClientId);
	router.use(maintenance.disableWrites);
	router.use(maintenance.disableReads);
	router.use(bodyParsers);

	router.get('/node/:nodeType/:code', async (req, res) => {
		requestLog('node', 'GET', req);
		return nodeCrud
			.read(
				Object.assign(
					{
						requestId: res.locals.requestId,
						clientId: res.locals.clientId,
						query: req.query
					},
					req.params
				)
			)
			.then(success(res), failure(res));
	});

	router.post('/node/:nodeType/:code', async (req, res) => {
		requestLog('node', 'POST', req);
		return nodeCrud
			.create(
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
			.then(success(res), failure(res));
	});

	router.put(
		'/node/:nodeType/:code',
		unimplemented('node PUT', 'PUT is unimplemented. Use PATCH')
	);

	router.patch('/node/:nodeType/:code', async (req, res) => {
		requestLog('node', 'PATCH', req);
		return nodeCrud
			.update(
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
			.then(success(res), failure(res));
	});

	router.delete('/node/:nodeType/:code', async (req, res) => {
		requestLog('node', 'DELETE', req);
		return nodeCrud
			.delete(
				Object.assign(
					{
						requestId: res.locals.requestId,
						clientId: res.locals.clientId
					},
					req.params
				)
			)
			.then(success(res), failure(res));
	});

	router.get(
		'/relationship/:nodeType/:code/:relationshipType/:relatedType/:relatedCode',
		async (req, res) => {
			requestLog('relationship', 'GET', req);
			return relationshipCrud
				.read(
					Object.assign(
						{
							requestId: res.locals.requestId,
							clientId: res.locals.clientId
						},
						req.params
					)
				)
				.then(success(res), failure(res));
		}
	);

	router.post(
		'/relationship/:nodeType/:code/:relationshipType/:relatedType/:relatedCode',
		async (req, res) => {
			requestLog('relationship', 'POST', req);
			return relationshipCrud
				.create(
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
				.then(success(res), failure(res));
		}
	);

	router.put(
		'/relationship/:nodeType/:code/:relationshipType/:relatedType/:relatedCode',
		unimplemented('node PUT', 'PUT is unimplemented. Use PATCH')
	);

	router.patch(
		'/relationship/:nodeType/:code/:relationshipType/:relatedType/:relatedCode',
		async (req, res) => {
			requestLog('relationship', 'PATCH', req);
			return relationshipCrud
				.update(
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
				.then(success(res), failure(res));
		}
	);

	router.delete(
		'/relationship/:nodeType/:code/:relationshipType/:relatedType/:relatedCode',
		async (req, res) => {
			requestLog('relationship', 'DELETE', req);
			return relationshipCrud
				.delete(
					Object.assign(
						{
							requestId: res.locals.requestId,
							clientId: res.locals.clientId
						},
						req.params
					)
				)
				.then(success(res), failure(res));
		}
	);

	return router;
};

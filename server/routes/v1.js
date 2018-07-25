const bodyParser = require('body-parser');
const logger = require('@financial-times/n-logger').default;
const timeout = require('connect-timeout');
const security = require('../middleware/security');
const { nodeCrud, relationshipCrud } = require('../crud');
const requestId = require('../middleware/request-id');
const clientId = require('../middleware/client-id');

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

module.exports = router => {
	router.use(timeout('65s'));

	router.use(security.requireApiKey);
	router.use(security.requireClientId);
	router.use(requestId);
	router.use(clientId.setClientIdFromHeadersToLocals);
	router.use(clientId.disableWrites);
	router.use(clientId.disableReads);
	router.use(bodyParsers);

	router.get('/node/:nodeType/:code', async (req, res) => {
		logger.info('[APP] node GET', req.params);
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
		logger.info('[APP] node POST', req.params);
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
		logger.info('[APP] node PATCH', req.params);
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
		logger.info('[APP] node DELETE', req.params);
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
			logger.info('[APP] relationship GET', req.params);
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
			logger.info('[APP] relationship POST', req.params);
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
			logger.info('[APP] relationship PATCH', req.params);
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
			logger.info('[APP] relationship DELETE', req.params);
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

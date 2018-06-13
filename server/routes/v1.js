const bodyParser = require('body-parser');
const logger = require('../lib/multiline-logger');
const timeout = require('connect-timeout');
const security = require('../middleware/security');
const { nodeCrud, relationshipCrud } = require('../rest');
const requestId = require('../middleware/request-id');
const clientId = require('../middleware/client-id');

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true })
];

const success = res => data =>
	data.status ? res.status(data.status).json(data.data) : res.json(data);

const failure = res => err => {
	if (process.env.LOG_LEVEL === 'debug') {
		console.info('CRUD_ERROR', err);
	}
	if (!err.status) {
		logger.info({ error: err });
		err = { status: 500, message: err.toString() };
	}
	res.status(err.status).json({ error: err.message });
};

module.exports = router => {
	router.use(timeout('65s'));

	router.use(security.requireApiKey);
	router.use(security.requireClientId);
	router.use(requestId);
	router.use(clientId);
	router.use(bodyParsers);

	router.get('/', (req, res) => {
		res.send('biz op api v1');
	});

	router.get('/node/:nodeType/:code', async (req, res) => {
		logger.info({ event: 'node GET', params: req.params });
		return nodeCrud
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
	});

	router.post('/node/:nodeType/:code', async (req, res) => {
		logger.info({ event: 'node POST', params: req.params });
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

	router.put('/node/:nodeType/:code', async (req, res) => {
		logger.info({ event: 'node PUT', params: req.params });

		res.status(405).send('PUT is unimplemented. Use PATCH');
	});

	router.patch('/node/:nodeType/:code', async (req, res) => {
		logger.info({ event: 'node PATCH', params: req.params });
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
		logger.info({ event: 'node DELETE', params: req.params });
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
			logger.info({ event: 'relationship GET', params: req.params });
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
			logger.info({ event: 'relationship POST', params: req.params });
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
		async (req, res) => {
			logger.info({ event: 'node PUT', params: req.params });

			res.status(405).send('PUT is unimplemented. Use PATCH');
		}
	);

	router.patch(
		'/relationship/:nodeType/:code/:relationshipType/:relatedType/:relatedCode',
		async (req, res) => {
			logger.info({ event: 'relationship PATCH', params: req.params });
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
			logger.info({ event: 'relationship DELETE', params: req.params });
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

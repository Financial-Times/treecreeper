const bodyParser = require('body-parser');
const logger = require('@financial-times/n-logger').default;
const timeout = require('connect-timeout');
const security = require('../middleware/security');
const { node: nodeCrud } = require('../crud');
const requestId = require('../middleware/request-id');
const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true })
];

const success = res => data =>
	data.status ? res.status(data.status).json(data.data) : res.json(data);
const failure = res => err => {
	console.log(err);
	if (!err.status) {
		logger.info({ error: err });
		err = { status: 500, message: err.toString() };
	}
	res.status(err.status).send(err.message);
};

module.exports = router => {
	router.use(timeout('65s'));

	router.use(security.requireApiKey);
	router.use(security.requireClientId);
	router.use(requestId);
	router.use(bodyParsers);

	router.get('/', (req, res) => {
		res.send('biz op api v1');
	});

	// GENERIC - Node
	router.get('/node/:nodeType/:code', async (req, res) => {
		logger.info('[APP] node GET', req.params);
		return nodeCrud
			.get(
				Object.assign(
					{
						requestId: res.locals.requestId
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
						body: req.body
					},
					req.params,
					req.query
				)
			)
			.then(success(res), failure(res));
	});

	router.patch('/node/:nodeType/:code', async (req, res) => {
		logger.info('[APP] node PATCH', req.params);
		return nodeCrud
			.update(
				Object.assign(
					{
						requestId: res.locals.requestId,
						body: req.body
					},
					req.params,
					req.query
				)
			)
			.then(success(res), failure(res));
	});
	// router.delete(
	// 	'/node/:nodeType/:uniqueAttrName/:uniqueAttr',
	// 	async (req, res) => {
	// 		logger.info('[APP] generic DELETE');
	// 		return crud.remove(
	// 			res,
	// 			req.params.nodeType,
	// 			req.params.uniqueAttrName,
	// 			req.params.uniqueAttr,
	// 			req.body.mode
	// 		);
	// 	}
	// );

	return router;
};

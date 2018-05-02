'use strict';

const bodyParser = require('body-parser');
const logger = require('@financial-times/n-logger').default;
const timeout = require('connect-timeout');
const security = require('../middleware/security');
const supplier = require('../controllers/supplier');
const survey = require('../controllers/survey');
const contract = require('../controllers/contract');
const request = require('../controllers/request');
const submission = require('../controllers/submission');
const crud = require('../controllers/_crud');
const graphQl = require('../controllers/graphQl');
const cypher = require('../controllers/_cypher');

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true }),
];

// Catch errors thrown by async code and return it to the express error handlers
const asyncMiddleware = middleware => async (req, res, next) => {
	try {
		await middleware(req, res, next);
	} catch (error) {
		next(error);
	}
};

module.exports = router => {
	router.use(timeout('65s'));

	router.post('/graphql', security.requireApiKeyOrS3o, bodyParsers, graphQl.api);

	router.use(security.requireApiKey);
	router.use(bodyParsers);

	router.get('/', (req, res) => {
		res.send('biz op api');
	});

	// SAR HUB - Specific (to phase out)
	router.post('/request', asyncMiddleware(request.create));
	router.get('/request', asyncMiddleware(request.get));
	router.get('/request/:id', asyncMiddleware(request.getWithSources));

	// WEBPMA / 3SP - Specific (to phase out)
	router.get('/contracts/:supplierId', contract.get);
	router.get('/submissions/:contractOrSupplierId/:surveyId/:topLevel', submission.getAllforOne);
	router.get('/survey/:id', survey.get);
	router.get('/surveys/:type', survey.getAll);
	router.post('/supplier/', supplier.create);
	router.post('/submission/id/:submissionId', submission.submit); // TODO can be abstracted - add relationships

	// GENERIC - Node
	router.get(
		'/:nodeType/:uniqueAttrName?/:uniqueAttr?/:relationships?',
		asyncMiddleware(async (req, res) => {
			console.log('[APP] generic GET', req.params);
			return crud.get(
				res,
				req.params.nodeType,
				req.params.uniqueAttrName,
				req.params.uniqueAttr,
				req.params.relationships
			);
		})
	);
	router.post(
		'/:nodeType/:uniqueAttrName/:uniqueAttr/:upsert?',
		asyncMiddleware(async (req, res) => {
			console.log('[APP] generic POST');
			return crud.create(
				res,
				req.params.nodeType,
				req.params.uniqueAttrName,
				req.params.uniqueAttr,
				req.body.node,
				req.body.relationships,
				req.params.upsert
			);
		})
	);
	router.put(
		'/:nodeType/:uniqueAttrName/:uniqueAttr/:upsert?',
		asyncMiddleware(async (req, res) => {
			console.log('[APP] generic PUT');
			return crud.update(
				res,
				req.params.nodeType,
				req.params.uniqueAttrName,
				req.params.uniqueAttr,
				req.body.node,
				req.body.relationships,
				req.params.upsert
			);
		})
	);
	router.delete(
		'/:nodeType/:uniqueAttrName/:uniqueAttr',
		asyncMiddleware(async (req, res) => {
			console.log('[APP] generic DELETE');
			return crud.remove(
				res,
				req.params.nodeType,
				req.params.uniqueAttrName,
				req.params.uniqueAttr,
				req.body.mode
			);
		})
	);

	// GENERIC - Rship
	router.post(
		'/relationships/:upsert?',
		asyncMiddleware(async (req, res) => {
			console.log('[APP] generic POST - rship');
			return crud.create(res, null, null, null, null, req.body.relationships, req.params.upsert);
		})
	);

	router.post(
		'/cypher/',
		asyncMiddleware(async (req, res) => {
			console.log('[APP] generic GET CYPHER');
			return cypher(res, req.body.query);
		})
	);

	return router;
};

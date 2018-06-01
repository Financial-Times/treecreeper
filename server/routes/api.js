const bodyParser = require('body-parser');
const timeout = require('connect-timeout');
const security = require('../middleware/security');
const crud = require('../controllers/_crud');
const graphQl = require('../controllers/graphQl');
const cypher = require('../controllers/_cypher');

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true })
];

module.exports = router => {
	router.use(timeout('65s'));

	router.post(
		'/graphql',
		security.requireApiKeyOrS3o,
		bodyParsers,
		graphQl.api
	);

	router.use(security.requireApiKey);
	router.use(bodyParsers);

	router.get('/', (req, res) => {
		res.send('biz op api');
	});

	// GENERIC - Node
	router.get(
		'/:nodeType/:uniqueAttrName?/:uniqueAttr?/:relationships?',
		async (req, res) => {
			console.log('[APP] generic GET', req.params);
			return crud.get(
				res,
				req.params.nodeType,
				req.params.uniqueAttrName,
				req.params.uniqueAttr,
				req.params.relationships
			);
		}
	);
	router.post(
		'/:nodeType/:uniqueAttrName/:uniqueAttr/:upsert?',
		async (req, res) => {
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
		}
	);
	router.put(
		'/:nodeType/:uniqueAttrName/:uniqueAttr/:upsert?',
		async (req, res) => {
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
		}
	);
	router.delete('/:nodeType/:uniqueAttrName/:uniqueAttr', async (req, res) => {
		console.log('[APP] generic DELETE');
		return crud.remove(
			res,
			req.params.nodeType,
			req.params.uniqueAttrName,
			req.params.uniqueAttr,
			req.body.mode
		);
	});

	// GENERIC - Rship
	router.post('/relationships/:upsert?', async (req, res) => {
		console.log('[APP] generic POST - rship');
		return crud.create(
			res,
			null,
			null,
			null,
			null,
			req.body.relationships,
			req.params.upsert
		);
	});

	router.post('/cypher/', async (req, res) => {
		console.log('[APP] generic GET CYPHER');
		return cypher(res, req.body.query);
	});

	return router;
};

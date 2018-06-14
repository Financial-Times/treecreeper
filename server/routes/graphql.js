const bodyParser = require('body-parser');
const timeout = require('connect-timeout');
const security = require('../middleware/security');
const graphQl = require('../controllers/graphQl');

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true })
];

module.exports = router => {
	router.use(timeout('65s'));
	router.use(security.requireApiKeyOrS3o);
	router.use(bodyParsers);
	router.post('/', graphQl.api);

	return router;
};

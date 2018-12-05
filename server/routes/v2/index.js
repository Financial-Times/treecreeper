const bodyParser = require('body-parser');
const security = require('../../middleware/security');
const maintenance = require('../../middleware/maintenance');
const timeout = require('connect-timeout');

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true })
];

const { controller, unimplemented } = require('../lib/route-helpers');

module.exports = router => {
	router.use(timeout('65s'));
	router.use(security.requireApiKey);
	router.use(security.requireClientId);
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

	return router;
};

const uuid = require('uuid/v1');

module.exports = logger => (req, res, next) => {
	res.locals.requestId = req.get('x-request-id') || uuid();
	logger.setContext('requestId', res.locals.requestId);

	next();
};

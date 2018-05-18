const uuid = require('uuid/v1');

module.exports = (req, res, next) => {
	res.locals.requestId = req.get('x-request-id') || uuid();
	next();
};

const uuid = require('uuid/v1');

module.exports = (req, res, next) => {
	res.locals.clientId = req.get('x-client-id') || uuid();
	next();
};

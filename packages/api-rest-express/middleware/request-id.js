const uuid = require('uuid/v1');
const { setContext } = require('../../api-core/lib/request-context');

module.exports = (req, res, next) => {
	res.locals.requestId = req.get('x-request-id') || uuid();
	setContext('requestId', res.locals.requestId);

	next();
};

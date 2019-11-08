const uuid = require('uuid/v1');
const {
	setContext,
} = require('@financial-times/treecreeper-api-express-logger');

module.exports = (req, res, next) => {
	res.locals.requestId = req.get('x-request-id') || uuid();
	setContext('requestId', res.locals.requestId);

	next();
};

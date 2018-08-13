const { setContext } = require('../lib/request-context');

module.exports = (req, res, next) => {
	res.locals.clientId = req.get('client-id');
	setContext('clientId', res.locals.clientId);
	next();
};

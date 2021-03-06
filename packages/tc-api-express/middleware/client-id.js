const httpErrors = require('http-errors');
const { setContext } = require('@financial-times/tc-api-express-logger');

module.exports = (req, res, next) => {
	if (!req.get('client-id') && !req.get('client-user-id')) {
		throw httpErrors(
			400,
			'A client-id or client-user-id header is required',
		);
	}

	res.locals.clientId = req.get('client-id');
	res.locals.clientUserId = req.get('client-user-id');

	setContext('clientId', res.locals.clientId);
	setContext('clientUserId', res.locals.clientUserId);
	next();
};

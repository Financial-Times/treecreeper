const httpErrors = require('http-errors');

module.exports = logger => (req, res, next) => {
	if (!req.get('client-id') && !req.get('client-user-id')) {
		throw httpErrors(
			400,
			'A client-id or client-user-id header is required',
		);
	}

	res.locals.clientId = req.get('client-id');
	res.locals.clientUserId = req.get('client-user-id');

	logger.setContext('clientId', res.locals.clientId);
	logger.setContext('clientUserId', res.locals.clientUserId);
	next();
};

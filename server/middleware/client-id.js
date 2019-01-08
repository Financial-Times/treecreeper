const { setContext } = require('../lib/request-context');
const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');

const CLIENT_ID_RX = /^[a-z\d][a-z\d\-\.]*[a-z\d]$/;

module.exports = (req, res, next) => {
	if (!req.get('client-id')) {
		throw httpErrors(400, 'Missing client-id header');
	}
	res.locals.clientId = req.get('client-id');
	res.locals.clientUserId = req.get('client-user-id');
	setContext('clientId', res.locals.clientId);
	if (!CLIENT_ID_RX.test(res.locals.clientId)) {
		throw httpErrors(
			400,
			stripIndents`Invalid client id \`${res.locals.clientId}\`.
		Must be a string containing only a-z, 0-9, . and -, not beginning or ending with -.`
		);
	}
	next();
};

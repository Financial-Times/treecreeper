const { setContext } = require('../lib/request-context');
const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');

const CLIENT_ID_RX = /^[a-z\d][a-z\d\-\.]*[a-z\d]$/;
const CLIENT_USER_ID_RX = /^[a-z\d][a-z\d\-\.]*[a-z\d]$/;

module.exports = (req, res, next) => {
	if (!req.get('client-id') && !req.get('client-user-id')) {
		throw httpErrors(400, 'A client-id or client-user-id header is required');
	}

	if (req.get('client-id')) {
		res.locals.clientId = req.get('client-id');
		setContext('clientId', res.locals.clientId);

		if (!CLIENT_ID_RX.test(res.locals.clientId)) {
			throw httpErrors(
				400,
				stripIndents`Invalid client id \`${res.locals.clientId}\`.
			Must be a string containing only a-z, 0-9, . and -, not beginning or ending with -.`
			);
		}
	}

	if (req.get('client-user-id')) {
		res.locals.clientUserId = req.get('client-user-id');
		setContext('clientUserId', res.locals.clientUserId);

		if (!CLIENT_USER_ID_RX.test(res.locals.clientUserId)) {
			throw httpErrors(
				400,
				stripIndents`Invalid client user id \`${res.locals.clientUserId}\`.
			It does not appear to be an LDAP user, expecting firstname.surname`
			);
		}
	}
	next();
};

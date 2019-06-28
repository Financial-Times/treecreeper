const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const { setContext } = require('../lib/request-context');

const CLIENT_ID_RX = /^[a-z\d][a-z\d-.]*[a-z\d]$/;
const CLIENT_USER_ID_RX = /^[a-z\d][a-z\d-.']*[a-z\d]$/;

const validateHeader = (header, errorMessage, expectedValueFormat) => {
	if (!expectedValueFormat.test(header)) {
		throw httpErrors(400, errorMessage);
	}
};

module.exports = (req, res, next) => {
	if (!req.get('client-id') && !req.get('client-user-id')) {
		throw httpErrors(
			400,
			'A client-id or client-user-id header is required',
		);
	}

	res.locals.clientId = req.get('client-id');
	res.locals.clientUserId = req.get('client-user-id');

	if (res.locals.clientId) {
		const errorMessage = stripIndents`Invalid client id \`${res.locals.clientId}\`.
			Must be a string containing only a-z, 0-9, . and -, not beginning or ending with -.`;

		setContext('clientId', res.locals.clientId);
		validateHeader(res.locals.clientId, errorMessage, CLIENT_ID_RX);
	}

	if (res.locals.clientUserId) {
		const errorMessage = stripIndents`Invalid client user id \`${res.locals.clientUserId}\`.
			It does not appear to be an LDAP user, expecting firstname.surname`;

		setContext('clientUserId', res.locals.clientUserId);
		validateHeader(
			res.locals.clientUserId,
			errorMessage,
			CLIENT_USER_ID_RX,
		);
	}
	next();
};

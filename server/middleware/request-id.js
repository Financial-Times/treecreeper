const uuid = require('uuid/v1');
const { setContext } = require('../lib/request-context');
const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');

const REQUEST_ID_RX = /^[a-z\d][a-z\d\-]+[a-z\d]$/i;

module.exports = (req, res, next) => {
	res.locals.requestId = req.get('x-request-id') || uuid();
	setContext('requestId', res.locals.requestId);
	if (!REQUEST_ID_RX.test(res.locals.requestId)) {
		throw httpErrors(
			400,
			stripIndents`Invalid request id \`${res.locals.requestId}\`.
		Must be a string containing only a-z, 0-9 and -, not beginning or ending with -.`
		);
	}
	next();
};

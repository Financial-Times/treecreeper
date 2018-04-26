'use strict';

const s3o = require('@financial-times/s3o-middleware').authS3ONoRedirect;

const hasApiKey = req => req.headers.api_key === process.env.API_KEY;

const requireApiKey = (req, res, next) => {
	if (!hasApiKey(req)) {
		return res.status(400).end('Wrong API key');
	}
	return next();
};

const requireApiKeyOrS3o = (req, res, next) => {
	if (!hasApiKey(req)) {
		return s3o(req, res, next);
	}
	return next();
};

module.exports = {
	requireApiKey,
	requireApiKeyOrS3o,
};

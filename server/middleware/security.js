const { logger } = require('../lib/request-context');

if (!process.env.API_KEY) {
	throw new Error('Critical error: No API_KEY environment variable defined.');
}

const hasApiKey = req => {
	if (process.env.API_KEY && req.headers.api_key === process.env.API_KEY) {
		if (process.env.API_KEY_NEW) {
			logger.info({ event: 'API_KEY_USAGE', version: 'old' });
		}
		return true;
	}

	if (
		process.env.API_KEY_NEW &&
		req.headers.api_key === process.env.API_KEY_NEW
	) {
		logger.info({ event: 'API_KEY_USAGE', version: 'new' });
		return true;
	}
	return false;
};

const requireApiKey = (req, res, next) => {
	if (!hasApiKey(req)) {
		return res
			.status(401)
			.send('Missing or invalid api-key header')
			.end();
	}
	return next();
};

module.exports = {
	requireApiKey,
};

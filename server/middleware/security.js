const s3o = require('@financial-times/s3o-middleware');

const hasApiKey = req => req.headers.api_key === process.env.API_KEY;

const requireApiKey = (req, res, next) => {
	if (!hasApiKey(req)) {
		return res
			.status(401)
			.send('Missing or invalid api-key header')
			.end();
	}
	return next();
};

const requireClientId = (req, res, next) => {
	if (!req.get('client-id')) {
		return res
			.status(400)
			.send('Missing client-id header')
			.end();
	}
	return next();
};

const requireApiAuthOrS3o = (req, res, next) => {
	if (!(hasApiKey(req) && req.get('client-id'))) {
		res.locals.clientId = 's30-user';
		return s3o.authS3ONoRedirect(req, res, next);
	}
	return next();
};

module.exports = {
	requireS3o: s3o,
	requireApiKey,
	requireClientId,
	requireApiAuthOrS3o
};

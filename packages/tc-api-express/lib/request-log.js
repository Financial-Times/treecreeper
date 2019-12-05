const {
	logger,
	setContext,
} = require('@financial-times/tc-api-express-logger');

const requestLog = (endpoint, method, req, res) => {
	res.nextMetricsName = `${endpoint}_`;
	if (req.params && req.params.type) {
		res.nextMetricsName = `${res.nextMetricsName}${req.params.type}_`;
	}
	setContext({
		endpoint,
		method,
		params: req.params,
		query: req.query,
		bodyKeys: Object.keys(req.body || {}),
	});

	logger.info(
		{
			event: 'ACCESS_LOG',
		},
		`Request received ${endpoint} ${method}`,
	);
};

module.exports = { requestLog };

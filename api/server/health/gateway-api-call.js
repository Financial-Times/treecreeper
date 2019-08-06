const callApiCheck = require('./api-call-healthcheck');
const healthcheck = require('./healthcheck');

const callApiGatewayCheck = () =>
	callApiCheck({
		headers: {
			'x-api-key': process.env.FT_API_GATEWAY_KEY,
			'client-id': `HEALTHCHECK_FT_API_GATEWAY`,
		},
		url: `${process.env.FT_API_GATEWAY_URL}/__gtg`,
		type: 'FT Api Gateway',
	});

module.exports = healthcheck(callApiGatewayCheck, 'apiCall', 'FT API Gateway');

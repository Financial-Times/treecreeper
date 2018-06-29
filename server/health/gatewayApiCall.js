const callApiCheck = require('./api-call-healthcheck');
const healthcheck = require('./healthcheck');
const outputs = require('./output');

const callApiGatewayCheck = async () => {
	const result = await callApiCheck({
		headers: {
			'x-api-key': process.env.FT_API_GATEWAY_KEY,
			'client-id': `HEALTHCHECK_FT_API_GATEWAY`
		},
		url: process.env.FT_API_GATEWAY_URL,
		type: 'FT Api Gateway'
	});

	return {
		lastCheckOk: result.lastCheckOk,
		lastCheckTime: result.lastCheckTime,
		lastCheckOutput: result.lastCheckOutput,
		panicGuide: result.panicGuide
	};
};

module.exports = healthcheck(
	callApiGatewayCheck,
	outputs.apiCall,
	'FT API Gateway'
);

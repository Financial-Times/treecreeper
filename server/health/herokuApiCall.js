const callApiCheck = require('./api-call-healthcheck');
const healthcheck = require('./healthcheck');
const outputs = require('./output');
const callApiHerokuCheck = async () => {
	const result = await callApiCheck({
		headers: {
			api_key: process.env.API_KEY,
			'client-id': `HEALTHCHECK_HEROKU`
		},
		url: `${process.env.HEROKU_API_URL}/__gtg`,
		type: 'Heroku'
	});
	return {
		lastCheckOk: result.lastCheckOk,
		lastCheckTime: result.lastCheckTime,
		lastCheckOutput: result.lastCheckOutput,
		panicGuide: result.panicGuide
	};
};

module.exports = healthcheck(callApiHerokuCheck, outputs.apiCall, 'Heroku');

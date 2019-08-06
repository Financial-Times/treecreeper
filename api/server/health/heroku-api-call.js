const callApiCheck = require('./api-call-healthcheck');
const healthcheck = require('./healthcheck');

const callApiHerokuCheck = () =>
	callApiCheck({
		headers: {
			api_key: process.env.API_KEY,
			'client-id': `HEALTHCHECK_HEROKU`,
		},
		url: `${process.env.HEROKU_API_URL}/__gtg`,
		type: 'Heroku',
	});

module.exports = healthcheck(callApiHerokuCheck, 'apiCall', 'Heroku');

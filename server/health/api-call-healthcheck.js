const logger = require('@financial-times/n-logger').default;
const fetch = require('isomorphic-fetch');

module.exports = async ({ headers, url, type }) => {
	try {
		const response = await fetch(url, {
			method: 'GET',
			headers
		});
		if (response.status === 200) {
			return {
				lastCheckOk: true,
				lastCheckTime: new Date().toUTCString(),
				lastCheckOutput: `Successful call to the Biz-Ops API via ${type} with a status code equal to 200.`,
				panicGuide: "Don't panic."
			};
		} else {
			throw `Unsuccessful call to Biz-Ops API via ${type} with status code equal to ${
				response.status
			} `;
		}
	} catch (error) {
		logger.error(
			{
				event: 'BIZ_OPS_HEALTHCHECK_FAILURE',
				healthCheckName: 'API_CALL',
				error
			},
			'Healthcheck failed'
		);
		return {
			lastCheckOk: false,
			lastCheckTime: new Date().toUTCString(),
			lastCheckOutput: `Bad response when trying to make a call to the Biz-Ops API via ${type} ${
				error.message ? error.message : error
			}`,
			panicGuide:
				'Please check the logs in splunk using the following: `source="/var/log/apps/heroku/ft-biz-ops-api.log" event="BIZ_OPS_HEALTHCHECK_FAILURE" healthCheckName="API_CALL"`'
		};
	}
};

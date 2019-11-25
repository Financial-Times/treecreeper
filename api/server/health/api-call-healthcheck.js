const fetch = require('node-fetch');
const { logger } = require('../../../packages/tc-api-express-logger');

module.exports = async ({ headers, url, type }) => {
	try {
		const response = await fetch(url, {
			method: 'GET',
			headers,
		});
		if (response.status === 200) {
			return {
				ok: true,
				lastUpdated: new Date().toUTCString(),
				checkOutput: `Successful call to the Biz-Ops API via ${type} with a status code equal to 200.`,
			};
		}
		throw new Error(
			`Unsuccessful call to Biz-Ops API via ${type} with status code equal to ${response.status}`,
		);
	} catch (error) {
		logger.error(
			{
				event: 'BIZ_OPS_HEALTHCHECK_FAILURE',
				healthCheckName: 'API_CALL',
				error,
			},
			'Healthcheck failed',
		);
		return {
			ok: false,
			lastUpdated: new Date().toUTCString(),
			checkOutput: `Bad response when trying to make a call to the Biz-Ops API via ${type} ${
				error.message ? error.message : error
			}`,
		};
	}
};

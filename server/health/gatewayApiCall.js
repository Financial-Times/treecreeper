const logger = require('@financial-times/n-logger').default;
const fetch = require('isomorphic-fetch');

const FIVE_MINUTES = 5 * 60 * 1000;

let lastCheckOk;
let lastCheckTime;
let lastCheckOutput;
let panicGuide;

const callApiGatewayCheck = async () => {
	const currentDate = new Date().toUTCString();
	try {
		const response = await fetch(`https://api.ft.com/biz-ops/v1`, {
			method: 'GET',
			headers: {
				'x-api-key': process.env.API_GATEWAY_KEY,
				'client-id': 'healthcheck-api-gateway-call'
			}
		});
		if (response.status === 200) {
			lastCheckOk = true;
			lastCheckTime = currentDate;
			lastCheckOutput =
				'Successful call to the Biz-Ops API via API Gateway with a status code equal to 200.';
		} else {
			throw `Unsuccessful call to Biz-Ops API via API Gateway with status code equal to ${
				response.status
			} `;
		}
	} catch (err) {
		logger.error(
			{
				event: 'BIZ_OPS_HEALTHCHECK_API_GATEWAY_CALL_FAILURE',
				err
			},
			'Healthcheck failed'
		);
		lastCheckOk = false;
		lastCheckTime = currentDate;
		lastCheckOutput = `Bad response when trying to make a call to the Biz-Ops API via API Gateway ${
			err.message ? err.message : err
		}`;
		panicGuide =
			'Please check the logs in splunk using the following: `source="/var/log/apps/heroku/ft-biz-ops-api.log" event="BIZ_OPS_HEALTHCHECK_API_GATEWAY_CALL_FAILURE"';
	}
};
callApiGatewayCheck();

setInterval(async () => {
	await callApiGatewayCheck();
}, FIVE_MINUTES).unref();

module.exports = {
	getStatus: () => {
		return {
			ok: lastCheckOk,
			checkOutput: lastCheckOutput,
			lastUpdated: lastCheckTime,
			businessImpact:
				'Unable to retrieve data from Biz-Ops API via API Gateway. As a result, it will not be possible to read information about our systems, contacts, teams or products.',
			severity: '1',
			technicalSummary:
				'Makes a call to the Biz-Ops API via API Gateway and checks that the response code is equal to 200',
			panicGuide: panicGuide,
			_dependencies: ['GrapheneDB']
		};
	}
};

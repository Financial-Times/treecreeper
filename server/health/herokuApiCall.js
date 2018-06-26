const logger = require('@financial-times/n-logger').default;
const fetch = require('isomorphic-fetch');

const FIVE_MINUTES = 5 * 60 * 1000;

let lastCheckOk;
let lastCheckTime;
let lastCheckOutput;
let panicGuide;

const callApiHerokuCheck = async () => {
	const currentDate = new Date().toUTCString();
	try {
		const response = await fetch(`https://biz-ops.api.ft.com/v1`, {
			method: 'GET',
			headers: {
				api_key: process.env.API_KEY,
				'client-id': 'healthcheck-api-heroku-call'
			}
		});
		if (response.status === 200) {
			lastCheckOk = true;
			lastCheckTime = currentDate;
			lastCheckOutput =
				'Successful API Heroku call to the Biz-Ops API with a status code equal to 200.';
		} else {
			throw `Unsuccessful API Heroku call to Biz-Ops API with status code equal to ${
				response.status
			} `;
		}
	} catch (err) {
		logger.error(
			{
				event: 'BIZ_OPS_HEALTHCHECK_API_HEROKU_CALL_FAILURE',
				err
			},
			'Healthcheck failed'
		);
		lastCheckOk = false;
		lastCheckTime = currentDate;
		lastCheckOutput = `Bad response when trying to make a call to the Biz-Ops API via Herkou ${
			err.message ? err.message : err
		}`;
		panicGuide =
			'Please check the logs in splunk using the following: `source="/var/log/apps/heroku/ft-biz-ops-api.log" event="BIZ_OPS_HEALTHCHECK_API_HEROKU_CALL_FAILURE"';
	}
};

callApiHerokuCheck();

setInterval(async () => {
	await callApiHerokuCheck();
}, FIVE_MINUTES).unref();

module.exports = {
	getStatus: () => {
		return {
			ok: lastCheckOk,
			checkOutput: lastCheckOutput,
			lastUpdated: lastCheckTime,
			businessImpact:
				'Unable to retrieve data from Biz-Ops API via Heroku. As a result, it will not be possible to read information about our systems, contacts, teams or products.',
			severity: '1',
			technicalSummary:
				'Makes a call to the Biz-Ops API via Heroku and checks that the response is equal to 200.',
			panicGuide: panicGuide,
			_dependencies: ['GrapheneDB']
		};
	}
};

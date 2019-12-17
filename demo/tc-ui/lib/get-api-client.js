const logger = require('@financial-times/lambda-logger');
const { ApiClient } = require('@financial-times/tc-ui/server');
const { graphqlBuilder } = require('./ui-mappings');

module.exports = {
	getApiClient: event =>
		new ApiClient({
			event,
			graphqlBuilder,
			logger,
			apiBaseUrl: 'http://local.in.ft.com:8888/api',
			apiHeaders: () => ({
				'x-api-key': process.env.BIZ_OPS_API_KEY,
				'client-id': 'biz-ops-admin',
				'client-user-id': 'rhys.evans',
			}),
		}),
};
